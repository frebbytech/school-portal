import React from "react";
import { Box, Breadcrumbs, Link, Typography } from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { breadcrumbLabel } from "./breadcrumbLabel";

export default function HomeLinks() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        px: 2,
        pb: 2,
      }}
    >
      <Breadcrumbs
        aria-label="breadcrumb"
        sx={{
          display: { xs: "none", md: "inline-flex" },
        }}
        separator="/"
      >
        <Link component={RouterLink} to="/" style={{ fontWeight: "bold" }}>
          Dashboard
        </Link>
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;

          return isLast ? (
            <Typography
              key={to}
              color="text.primary"
              sx={{ textTransform: "capitalize", fontSize: "14px" }}
            >
              {breadcrumbLabel(value)}
            </Typography>
          ) : (
            <Link
              key={to}
              component={RouterLink}
              to={to}
              style={{ textTransform: "capitalize", fontSize: "14px" }}
            >
              {breadcrumbLabel(value)}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
}
