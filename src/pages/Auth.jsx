import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Eye,
  EyeOff,
  Car,
} from "lucide-react";
import { authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Btn, Input, Divider } from "../components/ui";
import toast from "react-hot-toast";

export default function Auth() {
  const [mode, setMode] = useState("login"); // login | register | verify
  const [type, setType] = useState("rider");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    otp: "",
  });
  const { login } = useAuth();
  const { isDark, toggle } = useTheme();
  const nav = useNavigate();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleRegister = async () => {
    setLoading(true);
    try {
      const fn =
        type === "rider" ? authAPI.registerUser : authAPI.registerDriver;
      await fn({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      toast.success("OTP sent to your email!");
      setMode("verify");
    } catch (e) {
      toast.error(e.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const fn = type === "rider" ? authAPI.verifyUser : authAPI.verifyDriver;
      await fn({ email: form.email, otp: form.otp });
      toast.success("Email verified!");
      setMode("login");
    } catch (e) {
      toast.error(e.response?.data?.error || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const fn = type === "rider" ? authAPI.loginUser : authAPI.loginDriver;
      const res = await fn({ email: form.email, password: form.password });
      const d = res.data.message;

      // ← Get the actual role from the token, not from the tab
      const actualRole = d.user.Role || (type === "driver" ? "driver" : "user");
      login(d.user, d.token, actualRole);

      toast.success(`Welcome back, ${d.user.Name}!`);

      if (actualRole === "driver") {
        try {
          const profileRes = await driverAPI.getProfile();
          const profile = profileRes.data.driver;
          if (!profile.IsOnboardingCompleted) {
            toast(`Complete your onboarding`, { icon: "📋" });
            nav("/driver/onboarding");
          } else {
            nav("/driver");
          }
        } catch (e) {
          nav("/driver");
        }
      } else if (actualRole === "admin") {
        nav("/admin"); // ← redirect admin to admin dashboard
      } else {
        nav("/ride");
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex ${isDark ? "bg-zinc-950" : "bg-zinc-50"} font-sans`}
    >
      {/* Left visual — desktop only */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] bg-zinc-900 p-12 relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-20 w-64 h-64 rounded-full bg-brand/10 blur-3xl" />
          <div className="absolute bottom-20 -right-20 w-80 h-80 rounded-full bg-brand/5 blur-3xl" />
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-brand/30"
              style={{ left: `${15 + i * 14}%`, top: `${20 + i * 10}%` }}
              animate={{ y: [-8, 8, -8], opacity: [0.3, 0.8, 0.3] }}
              transition={{
                duration: 2 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            />
          ))}
        </div>
        <div>
          <h1 className="text-5xl font-black text-white font-display">
            Driv<span className="text-brand">o</span>
          </h1>
          <p className="text-zinc-400 mt-2 text-lg">Ride Smarter.</p>
        </div>
        <div className="space-y-6">
          {[
            [
              "🚀",
              "Instant Matching",
              "Get matched with the nearest driver in seconds",
            ],
            ["📍", "Live Tracking", "Watch your driver arrive in real time"],
            [
              "⭐",
              "Rated Drivers",
              "Only verified, top-rated drivers on the platform",
            ],
          ].map(([icon, title, desc]) => (
            <motion.div
              key={title}
              className="flex gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                {icon}
              </div>
              <div>
                <p className="text-white font-semibold">{title}</p>
                <p className="text-zinc-400 text-sm mt-0.5">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <p className="text-zinc-600 text-sm">© 2026 Drivo Technologies</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen overflow-y-auto">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="absolute top-5 right-5 w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          {isDark ? "☀️" : "🌙"}
        </button>

        <motion.div
          className="w-full max-w-[400px]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-4xl font-black text-zinc-900 dark:text-white font-display">
              Driv<span className="text-brand">o</span>
            </h1>
          </div>

          {/* Type toggle */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl p-1 mb-6">
            {[
              { k: "rider", icon: "🧑", label: "Rider" },
              { k: "driver", icon: "🚗", label: "Driver" },
            ].map(({ k, icon, label }) => (
              <button
                key={k}
                onClick={() => setType(k)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${type === k ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"}`}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Mode tabs */}
          {mode !== "verify" && (
            <div className="flex gap-1 mb-6 border-b border-zinc-100 dark:border-zinc-800">
              {["login", "register"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 pb-3 text-sm font-semibold capitalize transition-all border-b-2 -mb-px ${mode === m ? "border-brand text-brand" : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {mode === "register" && (
                <>
                  <Input
                    label="Full Name"
                    icon={User}
                    placeholder="John Doe"
                    value={form.name}
                    onChange={set("name")}
                  />
                  <Input
                    label="Email"
                    icon={Mail}
                    type="email"
                    placeholder="john@email.com"
                    value={form.email}
                    onChange={set("email")}
                  />
                  <Input
                    label="Phone"
                    icon={Phone}
                    placeholder="+2348012345678"
                    value={form.phone}
                    onChange={set("phone")}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      <input
                        type={showPass ? "text" : "password"}
                        className="w-full pl-11 pr-11 py-3.5 rounded-2xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800/80 border-2 border-transparent focus:border-brand text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition-all"
                        placeholder="Min 6 characters"
                        value={form.password}
                        onChange={set("password")}
                      />
                      <button
                        onClick={() => setShowPass((s) => !s)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <Btn size="lg" loading={loading} onClick={handleRegister}>
                    Create Account <ArrowRight size={16} />
                  </Btn>
                </>
              )}

              {mode === "verify" && (
                <>
                  <div className="text-center py-4">
                    <motion.div
                      className="text-6xl mb-4"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: 3, duration: 0.5 }}
                    >
                      📧
                    </motion.div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white font-display">
                      Check your email
                    </h2>
                    <p className="text-zinc-500 text-sm mt-1">
                      We sent a code to{" "}
                      <span className="text-brand font-medium">
                        {form.email}
                      </span>
                    </p>
                  </div>
                  <input
                    className="w-full py-5 rounded-2xl text-center text-4xl tracking-[0.5em] font-bold bg-zinc-100 dark:bg-zinc-800/80 border-2 border-transparent focus:border-brand text-zinc-900 dark:text-white focus:outline-none transition-all"
                    placeholder="·····"
                    value={form.otp}
                    onChange={set("otp")}
                    maxLength={6}
                  />
                  <Btn size="lg" loading={loading} onClick={handleVerify}>
                    Verify Email <ArrowRight size={16} />
                  </Btn>
                  <button
                    onClick={() => setMode("register")}
                    className="w-full text-center text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  >
                    ← Back to register
                  </button>
                </>
              )}

              {mode === "login" && (
                <>
                  <Input
                    label="Email"
                    icon={Mail}
                    type="email"
                    placeholder="john@email.com"
                    value={form.email}
                    onChange={set("email")}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      <input
                        type={showPass ? "text" : "password"}
                        className="w-full pl-11 pr-11 py-3.5 rounded-2xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800/80 border-2 border-transparent focus:border-brand text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition-all"
                        placeholder="Your password"
                        value={form.password}
                        onChange={set("password")}
                      />
                      <button
                        onClick={() => setShowPass((s) => !s)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <Btn size="lg" loading={loading} onClick={handleLogin}>
                    Sign In <ArrowRight size={16} />
                  </Btn>
                  {type === "driver" && (
                    <>
                      <Divider label="new driver?" />
                      <Btn
                        variant="secondary"
                        size="lg"
                        onClick={() => nav("/driver/onboarding")}
                      >
                        Complete Onboarding <Car size={16} />
                      </Btn>
                    </>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <p className="text-center text-xs text-zinc-400 mt-8">
            By continuing, you agree to Drivo's{" "}
            <span className="underline cursor-pointer">Terms of Service</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
