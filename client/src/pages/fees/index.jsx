import React from "react";
import { Outlet } from "react-router-dom";
import Container from "@mui/material/Container";
import FeeNav from "./layout/FeeNav";

const Fees = () => {
  return (
    <>
      <FeeNav />
      <Container >
        <Outlet />
      </Container>
    </>
  );
};

Fees.propTypes = {};

export default Fees;
