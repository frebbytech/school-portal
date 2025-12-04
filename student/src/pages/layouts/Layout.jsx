import React from "react";
import PropTypes from "prop-types";

function Layout({ children }) {
  return (
    <>
      {/* <main style={{ backgroundColor: "whitesmoke" }}>{children}</main>
      <Footer /> */}
    </>
  );
}

Layout.propTypes = {
  children: PropTypes.node,
};

export default Layout;
