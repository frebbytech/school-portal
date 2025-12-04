import React from 'react';
import Box from "@mui/material/Box";
function Content({ children }) {
  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        flex: 1,
        minHeight: "100svh",
      }}
    >
      {children}
    </Box>
  );
}

export default Content;
