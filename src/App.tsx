import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NotificationProvider } from "./contexts/NotificationContext";
import KOLs from "./pages/KOLs";
import Governance from "./pages/Governance";
import MemeForge from "./pages/MemeForge";
import Analytics from "./pages/Analytics";
import KOLProfile from "./pages/KOLProfile";
import Compare from "./pages/Compare";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Comments from "./pages/Comments";
import StreamOverlay from "./pages/StreamOverlay";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <NotificationProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<KOLs />} />
            <Route path="/kol/:id" element={<KOLProfile />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/governance" element={<Governance />} />
            <Route path="/meme-forge" element={<MemeForge />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/user/:walletAddress" element={<UserProfile />} />
            <Route path="/comments" element={<Comments />} />
            <Route path="/stream" element={<StreamOverlay />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </NotificationProvider>
  </QueryClientProvider>
);

export default App;
