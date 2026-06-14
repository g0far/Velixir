use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("5PB3w7dzxaRvc6pYJyhPTzuiwro5F8f4LMLW1dkAK7cU");

/// Wrapped-SOL mint — used as the "mint" for the native SOL pool.
const NATIVE_MINT: Pubkey = pubkey!("So11111111111111111111111111111111111111112");
const BPS_DENOMINATOR: u128 = 10_000;

#[program]
pub mod rialo_devnet {
    use super::*;

    /// Create a lending pool for `mint` with a max loan-to-value and a
    /// liquidation threshold (both in basis points, e.g. 8000 = 80%).
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        ltv_bps: u16,
        liq_threshold_bps: u16,
    ) -> Result<()> {
        require!(
            ltv_bps <= 10_000 && liq_threshold_bps <= 10_000,
            RialoError::InvalidParam
        );
        require!(ltv_bps <= liq_threshold_bps, RialoError::InvalidParam);

        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.mint = ctx.accounts.mint.key();
        pool.vault = ctx.accounts.vault.key();
        pool.is_native = ctx.accounts.mint.key() == NATIVE_MINT;
        pool.ltv_bps = ltv_bps;
        pool.liq_threshold_bps = liq_threshold_bps;
        pool.total_deposits = 0;
        pool.total_borrows = 0;
        pool.bump = ctx.bumps.pool;
        pool.vault_bump = ctx.bumps.vault;
        Ok(())
    }

    /// Deposit collateral into the pool vault.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, RialoError::ZeroAmount);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        let pos = &mut ctx.accounts.position;
        pos.owner = ctx.accounts.user.key();
        pos.pool = ctx.accounts.pool.key();
        pos.deposited = pos.deposited.checked_add(amount).ok_or(RialoError::MathOverflow)?;
        pos.bump = ctx.bumps.position;

        let pool = &mut ctx.accounts.pool;
        pool.total_deposits = pool.total_deposits.checked_add(amount).ok_or(RialoError::MathOverflow)?;
        Ok(())
    }

    /// Borrow against deposited collateral, capped at the pool LTV.
    pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
        require!(amount > 0, RialoError::ZeroAmount);

        let pool = &ctx.accounts.pool;
        let pos = &ctx.accounts.position;

        let new_borrowed = (pos.borrowed as u128)
            .checked_add(amount as u128)
            .ok_or(RialoError::MathOverflow)?;
        let max_borrow = (pos.deposited as u128)
            .checked_mul(pool.ltv_bps as u128)
            .ok_or(RialoError::MathOverflow)?
            / BPS_DENOMINATOR;
        require!(new_borrowed <= max_borrow, RialoError::ExceedsLtv);
        require!(ctx.accounts.vault.amount >= amount, RialoError::InsufficientLiquidity);

        let mint_key = pool.mint;
        let seeds: &[&[u8]] = &[b"pool", mint_key.as_ref(), &[pool.bump]];
        let signer = &[seeds];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_token.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        let pos = &mut ctx.accounts.position;
        pos.borrowed = new_borrowed as u64;
        let pool = &mut ctx.accounts.pool;
        pool.total_borrows = pool.total_borrows.checked_add(amount).ok_or(RialoError::MathOverflow)?;
        Ok(())
    }

    /// Repay borrowed funds back into the vault.
    pub fn repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
        require!(amount > 0, RialoError::ZeroAmount);
        let pos = &ctx.accounts.position;
        let repay_amt = amount.min(pos.borrowed);
        require!(repay_amt > 0, RialoError::NothingToRepay);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            repay_amt,
        )?;

        let pos = &mut ctx.accounts.position;
        pos.borrowed = pos.borrowed.checked_sub(repay_amt).ok_or(RialoError::MathOverflow)?;
        let pool = &mut ctx.accounts.pool;
        pool.total_borrows = pool.total_borrows.checked_sub(repay_amt).ok_or(RialoError::MathOverflow)?;
        Ok(())
    }

    /// Withdraw collateral, keeping any outstanding debt within LTV.
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, RialoError::ZeroAmount);
        let pool = &ctx.accounts.pool;
        let pos = &ctx.accounts.position;
        require!(pos.deposited >= amount, RialoError::InsufficientCollateral);

        let remaining = (pos.deposited - amount) as u128;
        let max_borrow = remaining
            .checked_mul(pool.ltv_bps as u128)
            .ok_or(RialoError::MathOverflow)?
            / BPS_DENOMINATOR;
        require!((pos.borrowed as u128) <= max_borrow, RialoError::ExceedsLtv);
        require!(ctx.accounts.vault.amount >= amount, RialoError::InsufficientLiquidity);

        let mint_key = pool.mint;
        let seeds: &[&[u8]] = &[b"pool", mint_key.as_ref(), &[pool.bump]];
        let signer = &[seeds];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_token.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        let pos = &mut ctx.accounts.position;
        pos.deposited = pos.deposited.checked_sub(amount).ok_or(RialoError::MathOverflow)?;
        let pool = &mut ctx.accounts.pool;
        pool.total_deposits = pool.total_deposits.checked_sub(amount).ok_or(RialoError::MathOverflow)?;
        Ok(())
    }

    /// Transfer the pool's recorded authority to a new owner. Must be signed by
    /// the current pool authority. (The authority field is informational — it
    /// gates nothing in this program — so this is an administrative/cosmetic
    /// ownership update.)
    pub fn set_authority(ctx: Context<SetAuthority>, new_authority: Pubkey) -> Result<()> {
        ctx.accounts.pool.authority = new_authority;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Pool::INIT_SPACE,
        seeds = [b"pool", mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        seeds = [b"vault", mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = pool,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [b"pool", pool.mint.as_ref()], bump = pool.bump)]
    pub pool: Account<'info, Pool>,
    #[account(mut, seeds = [b"vault", pool.mint.as_ref()], bump = pool.vault_bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserPosition::INIT_SPACE,
        seeds = [b"position", pool.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub position: Account<'info, UserPosition>,
    #[account(
        mut,
        constraint = user_token.mint == pool.mint @ RialoError::WrongMint,
        constraint = user_token.owner == user.key() @ RialoError::WrongOwner
    )]
    pub user_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Borrow<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [b"pool", pool.mint.as_ref()], bump = pool.bump)]
    pub pool: Account<'info, Pool>,
    #[account(mut, seeds = [b"vault", pool.mint.as_ref()], bump = pool.vault_bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"position", pool.key().as_ref(), user.key().as_ref()],
        bump = position.bump,
        constraint = position.owner == user.key() @ RialoError::WrongOwner
    )]
    pub position: Account<'info, UserPosition>,
    #[account(
        mut,
        constraint = user_token.mint == pool.mint @ RialoError::WrongMint,
        constraint = user_token.owner == user.key() @ RialoError::WrongOwner
    )]
    pub user_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Repay<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [b"pool", pool.mint.as_ref()], bump = pool.bump)]
    pub pool: Account<'info, Pool>,
    #[account(mut, seeds = [b"vault", pool.mint.as_ref()], bump = pool.vault_bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"position", pool.key().as_ref(), user.key().as_ref()],
        bump = position.bump,
        constraint = position.owner == user.key() @ RialoError::WrongOwner
    )]
    pub position: Account<'info, UserPosition>,
    #[account(
        mut,
        constraint = user_token.mint == pool.mint @ RialoError::WrongMint,
        constraint = user_token.owner == user.key() @ RialoError::WrongOwner
    )]
    pub user_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [b"pool", pool.mint.as_ref()], bump = pool.bump)]
    pub pool: Account<'info, Pool>,
    #[account(mut, seeds = [b"vault", pool.mint.as_ref()], bump = pool.vault_bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"position", pool.key().as_ref(), user.key().as_ref()],
        bump = position.bump,
        constraint = position.owner == user.key() @ RialoError::WrongOwner
    )]
    pub position: Account<'info, UserPosition>,
    #[account(
        mut,
        constraint = user_token.mint == pool.mint @ RialoError::WrongMint,
        constraint = user_token.owner == user.key() @ RialoError::WrongOwner
    )]
    pub user_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SetAuthority<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"pool", pool.mint.as_ref()],
        bump = pool.bump,
        constraint = pool.authority == authority.key() @ RialoError::WrongOwner
    )]
    pub pool: Account<'info, Pool>,
}

#[account]
#[derive(InitSpace)]
pub struct Pool {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub is_native: bool,
    pub ltv_bps: u16,
    pub liq_threshold_bps: u16,
    pub total_deposits: u64,
    pub total_borrows: u64,
    pub bump: u8,
    pub vault_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserPosition {
    pub owner: Pubkey,
    pub pool: Pubkey,
    pub deposited: u64,
    pub borrowed: u64,
    pub bump: u8,
}

#[error_code]
pub enum RialoError {
    #[msg("Invalid parameter")]
    InvalidParam,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Borrow exceeds allowed LTV")]
    ExceedsLtv,
    #[msg("Insufficient vault liquidity")]
    InsufficientLiquidity,
    #[msg("Nothing to repay")]
    NothingToRepay,
    #[msg("Insufficient collateral")]
    InsufficientCollateral,
    #[msg("Token account mint does not match pool")]
    WrongMint,
    #[msg("Token account owner mismatch")]
    WrongOwner,
}
