const asyncHandler = (fn) => (req, res, next) => {
  const safeNext =
    typeof next === "function"
      ? next
      : (err) => {
          console.error(err);
          if (!res.headersSent) {
            res.status(500).json({ success: false, error: "Server Error" });
          }
        };

  Promise.resolve(fn(req, res, safeNext)).catch(safeNext);
};

module.exports = asyncHandler;
