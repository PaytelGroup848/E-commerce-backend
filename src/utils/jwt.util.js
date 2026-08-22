const jwt = require("jsonwebtoken");

const isValidJwtFormat = (token) => {
  if (!token || typeof token !== "string") return false;
  const trimmed = token.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return false;
  const parts = trimmed.split(".");
  return parts.length === 3;
};

const generateTokens = (userId, role) => {
  const payload = { id: userId, role };

  // Increase expiry time for development
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "7d" }, // Changed from 15m to 7 days
  );

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "30d" }, // Changed from 7d to 30 days
  );

  return { accessToken, refreshToken };
};

const verifyAccessToken = (token) => {
  try {
    if (!isValidJwtFormat(token)) {
      throw new jwt.JsonWebTokenError("Invalid token format");
    }
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw error;
  }
};

const verifyRefreshToken = (token) => {
  try {
    if (!isValidJwtFormat(token)) {
      throw new jwt.JsonWebTokenError("Invalid token format");
    }
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
};
