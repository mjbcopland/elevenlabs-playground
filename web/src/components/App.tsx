import { QueryClientProvider } from "@tanstack/react-query";
import Home from "./Home";
import History from "./History";
import queryClient from "../api/client";
import { BrowserRouter, Route, Routes, createBrowserRouter } from "react-router-dom";
import { Suspense } from "react";
import HistoryItem from "./HistoryItem";

export default function App() {
  return (
    <Suspense fallback={null}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route index element={<Home />} />
            <Route path="history">
              <Route index element={<History />} />
              <Route path=":id" element={<HistoryItem />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </Suspense>
  );
}
