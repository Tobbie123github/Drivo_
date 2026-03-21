import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Auth from "./pages/Auth";
import Rider from "./pages/Rider";
import Driver from "./pages/Driver";
import Admin from "./pages/Admin";
import Onboarding from "./pages/Onboarding";
import { Loader } from "lucide-react";

function Guard({ children, role }) {
  const { token, role: r, loading } = useAuth();
  if (loading) return <Loader />;
  if (!token) return <Navigate to="/" replace />;
  if (role && r !== role) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { token, role } = useAuth();
  const dest = token
    ? role === "driver"
      ? "/driver"
      : role === "admin"
        ? "/admin"
        : "/ride"
    : "/";
  return (
    <Routes>
      <Route path="/" element={token ? <Navigate to={dest} /> : <Auth />} />
      <Route
        path="/ride"
        element={
          <Guard role="user">
            <Rider />
          </Guard>
        }
      />
      <Route
        path="/driver"
        element={
          <Guard role="driver">
            <Driver />
          </Guard>
        }
      />
      <Route
        path="/driver/onboarding"
        element={
          <Guard role="driver">
            <Onboarding />
          </Guard>
        }
      />
      <Route
        path="/admin"
        element={
          <Guard role="admin">
            <Admin />
          </Guard>
        }
      />
      <Route path="*" element={<Navigate to={dest} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#18181b",
                color: "#f4f4f5",
                border: "1px solid #27272a",
                borderRadius: "16px",
                fontFamily: "Poppins,sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                padding: "12px 16px",
              },
              success: { iconTheme: { primary: "#00C853", secondary: "#fff" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
