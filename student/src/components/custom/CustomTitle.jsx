import { Box, Stack, Typography, IconButton } from "@mui/material";
import React from "react";
import { ArrowBackRounded } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

function CustomTitle({
  title,
  titleVariant,
  subtitle,
  img,
  icon,
  color,
  bgcolor,
  showBack,
  to,
  right,
}) {
  const navigate = useNavigate();
  const goBack = () => navigate(to || -1);

  return (
    <>
      <Stack
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: { xs: "center", md: "flex-start" },
          alignItems: "center",
          py: 3,
          my: 2,
          px: 2,
          background:
            bgcolor || "linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%)",
          borderRadius: "12px",
          // boxShadow: "0 0 20px rgba(0, 0, 0, 0.08)",
        }}
        gap={2}
        width="100%"
      >
        <Stack
          flex="1"
          // flexDirection={{ xs: "column-reverse" ,md:'column'}}
          color={color}
          pl={1}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            {showBack && (
              <Box
                sx={{
                  backgroundColor: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  my: 1,
                }}
              >
                <IconButton
                  onClick={goBack}
                  sx={{ bgcolor: "rgba(1, 46, 84,0.1)" }}
                >
                  <ArrowBackRounded sx={{ color: color || "#fff" }} />
                </IconButton>
              </Box>
            )}
            {img ? (
              <img
                src={img}
                style={{
                  width: "40px",
                  height: "40px",
                }}
              />
            ) : (
              icon
            )}
            <Typography
              flex={1}
              // color="primary.main"
              variant={titleVariant || "h4"}
            >
              {title}
            </Typography>
          </Stack>
          <Typography color="text.secondary" variant="body2">
            {subtitle}
          </Typography>
        </Stack>
        {right}
      </Stack>

      {/* <Divider /> */}
    </>
  );
}

export default CustomTitle;
