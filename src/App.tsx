import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";

const Auth = lazy(() => import("./pages/Auth.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Studio = lazy(() => import("./pages/Studio.tsx"));
const VideoEditor = lazy(() => import("./pages/VideoEditor.tsx"));
const MyVideos = lazy(() => import("./pages/MyVideos.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const Upload = lazy(() => import("./pages/Upload.tsx"));
const Watch = lazy(() => import("./pages/Watch.tsx"));
const Channel = lazy(() => import("./pages/Channel.tsx"));
const Explore = lazy(() => import("./pages/Explore.tsx"));
const Shorts = lazy(() => import("./pages/Shorts.tsx"));
const Subscriptions = lazy(() => import("./pages/Subscriptions.tsx"));
const Playlists = lazy(() => import("./pages/Playlists.tsx"));
const PlaylistDetail = lazy(() => import("./pages/PlaylistDetail.tsx"));
const Search = lazy(() => import("./pages/Search.tsx"));
const History = lazy(() => import("./pages/History.tsx"));
const LikedVideos = lazy(() => import("./pages/LikedVideos.tsx"));
const WatchLater = lazy(() => import("./pages/WatchLater.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner theme="dark" />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/studio/editor" element={<VideoEditor />} />
              <Route path="/studio/videos" element={<MyVideos />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/watch/:id" element={<Watch />} />
              <Route path="/c/:id" element={<Channel />} />
              <Route path="/u/:id" element={<Channel />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/shorts" element={<Shorts />} />
              <Route path="/shorts/:id" element={<Shorts />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/playlists" element={<Playlists />} />
              <Route path="/playlist/:id" element={<PlaylistDetail />} />
              <Route path="/search" element={<Search />} />
              <Route path="/history" element={<History />} />
              <Route path="/liked" element={<LikedVideos />} />
              <Route path="/watch-later" element={<WatchLater />} />
              <Route path="/settings" element={<Settings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
