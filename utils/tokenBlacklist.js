// Simple in-memory token blacklist.
// Note: This resets when the server restarts. For multi-instance deployments, use Redis.

const blacklistedTokens = new Set();

const blacklistToken = (token) => {
  if (typeof token === 'string' && token.length > 0) {
    blacklistedTokens.add(token);
  }
};

const isBlacklisted = (token) => blacklistedTokens.has(token);

module.exports = {
  blacklistToken,
  isBlacklisted
};
