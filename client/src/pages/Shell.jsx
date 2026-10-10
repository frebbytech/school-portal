import React from "react";
import { Outlet } from "react-router-dom";
import Footer from "./layouts/Footer";
import Sidebar from "./layouts/Sidebar";
import Content from "./layouts/Content";
import Header from "./layouts/Header";
import { Box } from "@mui/material";
import HomeLinks from "@/components/HomeLinks";

const Shell = () => {
  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          bgcolor: "#ffffff",
        }}
      >
        <Sidebar />
        <Box sx={{ flex: 1 }}>
          <Header />
          <Content>
            <HomeLinks />
            <Outlet />
          </Content>
          <Footer bgcolor="transparent" color="#333" />
        </Box>
      </Box>
    </>
  );
};

export default Shell;
