"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    import("../components/studio.js");
  }, []);

  return <main id="app" className="fuga-app" />;
}
