import React, { Suspense } from "react";
import { Route } from "react-router-dom";
import Loader from "@/config/Loader";
import PageTitle from "@/components/items/PageTitle";

// Shows the page title and a loading state while a lazily loaded page downloads.
export const LazyRoute = ({ component: Component, fallback = <Loader />, ...rest }) => (
  <>
    <PageTitle />
    <Suspense fallback={fallback}>
      <Component {...rest} />
    </Suspense>
  </>
);

const elementFor = (node) => {
  if (node.element) return node.element;
  return <LazyRoute component={node.component} fallback={node.fallback} {...(node.props || {})} />;
};

// Turns route-table nodes into <Route> elements. Keys are paths so React can tell them apart.
export function renderRoutes(nodes) {
  return nodes.map((node, i) => {
    const key = node.index ? `index-${i}` : node.path;
    const children = node.children ? renderRoutes(node.children) : undefined;
    return node.index ? (
      <Route key={key} index element={elementFor(node)} />
    ) : (
      <Route key={key} path={node.path} element={elementFor(node)}>
        {children}
      </Route>
    );
  });
}
