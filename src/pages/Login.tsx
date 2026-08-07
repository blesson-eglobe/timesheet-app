import React, { useState } from "react";
import { useLogin } from "../hooks/useAuth";

// ─── Feature bullets shown in the left panel ─────────────────────────────────
interface FeatureItem {
	icon: React.ReactNode;
	text: string;
}

const FEATURES: FeatureItem[] = [
	{
		icon: (
			<svg
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
			>
				<circle cx="8" cy="8" r="6" />
				<path d="M8 5v3l2 2" />
			</svg>
		),
		text: "Effortless daily time logging",
	},
	{
		icon: (
			<svg
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
			>
				<path d="M2 4.5A1.5 1.5 0 013.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0114 6v5.5A1.5 1.5 0 0112.5 13h-9A1.5 1.5 0 012 11.5v-7z" />
			</svg>
		),
		text: "Real-time project visibility",
	},
	{
		icon: (
			<svg
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
			>
				<path d="M9 2.5H4a1.5 1.5 0 00-1.5 1.5v8A1.5 1.5 0 004 13.5h8a1.5 1.5 0 001.5-1.5V7" />
				<path d="M6 8l2 2 4.5-4.5" />
			</svg>
		),
		text: "Automated timesheet approvals",
	},
	{
		icon: (
			<svg
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
			>
				<path d="M3 13v-5M8 13V5M13 13v-3" />
			</svg>
		),
		text: "Resource utilization insights",
	},
];

export const Login: React.FC = () => {
	const loginMutation = useLogin();

	// ── Sign-in fields ──────────────────────────────────────────────────────────
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [remember, setRemember] = useState(false);
	const [showPwd, setShowPwd] = useState(false);
	const [loginError, setLoginError] = useState("");

	// ── Handler ───────────────────────────────────────────────────────────────────
	const handleSignIn = (e: React.FormEvent) => {
		e.preventDefault();
		setLoginError("");
		loginMutation.mutate(
			{ email, password },
			{
				onError: (err: any) => {
					if (!err.response) {
						setLoginError(
							"Cannot connect to backend API (localhost:4000). Please verify your Express server and PostgreSQL database are running.",
						);
					} else {
						const msg =
							err.response?.data?.message || "Invalid email or password";
						setLoginError(msg);
					}
				},
			},
		);
	};

	// ─────────────────────────────────────────────────────────────────────────────
	return (
		<div className="auth-page">
			{/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
			<div className="auth-page__left">
				<div className="auth-page__left-logo">
					<div className="auth-page__left-logo-icon">
						<svg
							viewBox="0 0 20 20"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.6"
						>
							<path d="M10 3L2 7l8 4 8-4-8-4zM2 11l8 4 8-4M2 15l8 4 8-4" />
						</svg>
					</div>
					<span>eGlobe</span>
				</div>

				<div className="auth-page__left-body">
					<p className="auth-page__left-eyebrow">WORKFORCE PLATFORM</p>
					<h2 className="auth-page__left-headline">
						Time tracked.
						<br />
						Teams aligned.
					</h2>
					<p className="auth-page__left-desc">
						The workforce management platform built for software teams that
						prioritize clarity and accountability.
					</p>
					<ul className="auth-page__features">
						{FEATURES.map((f, i) => (
							<li key={i} className="auth-page__feature">
								<span className="auth-page__feature-icon">{f.icon}</span>
								{f.text}
							</li>
						))}
					</ul>
				</div>
			</div>

			{/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
			<div className="auth-page__right">
				<div className="auth-page__form-wrap">

					<h1 className="auth-page__title">Welcome back</h1>
					<p className="auth-page__subtitle">
						Enter your credentials to access your workspace.
					</p>

					<form onSubmit={handleSignIn} className="auth-page__form">
						<div className="form-group">
							<label className="form-group__label">Email or Username</label>
							<input
								className="form-group__input"
								type="text"
								value={email}
								onChange={(e) => { setEmail(e.target.value); if (!e.target.value) setLoginError(""); }}
								placeholder="you@eglobeits.com or username"
								autoComplete="username"
								autoFocus
							/>
						</div>

						<div className="form-group">
							<div className="auth-page__pwd-row">
								<label className="form-group__label">Password</label>
								<span className="auth-page__forgot" tabIndex={0}>
									Forgot password?
								</span>
							</div>
							<div className="auth-page__pwd-wrap">
								<input
									className="form-group__input auth-page__pwd-input"
									type={showPwd ? "text" : "password"}
									value={password}
									onChange={(e) => { setPassword(e.target.value); if (!e.target.value) setLoginError(""); }}
									placeholder="••••••••"
									autoComplete="current-password"
								/>
								<button
									type="button"
									className="auth-page__eye"
									onClick={() => setShowPwd((v) => !v)}
									tabIndex={-1}
								>
									{showPwd ? (
										<svg
											viewBox="0 0 16 16"
											fill="none"
											stroke="currentColor"
											strokeWidth="1.5"
										>
											<path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" />
											<circle cx="8" cy="8" r="2" />
											<line x1="2" y1="2" x2="14" y2="14" />
										</svg>
									) : (
										<svg
											viewBox="0 0 16 16"
											fill="none"
											stroke="currentColor"
											strokeWidth="1.5"
										>
											<path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" />
											<circle cx="8" cy="8" r="2" />
										</svg>
									)}
								</button>
							</div>
						</div>

						<div className="auth-page__remember-row">
							<label className="auth-page__remember">
								<input
									type="checkbox"
									checked={remember}
									onChange={(e) => setRemember(e.target.checked)}
								/>
								<span>
									Remember me{" "}
									<span className="auth-page__remember-days">
										for 30 days
									</span>
								</span>
							</label>
						</div>

						{loginError && (
							<p
								style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}
							>
								{loginError}
							</p>
						)}
						<button
							type="submit"
							className="auth-page__submit-btn"
							disabled={loginMutation.isPending}
						>
							{loginMutation.isPending ? "Signing in…" : "Sign in"}
						</button>
					</form>

					{/* Invite hint */}
					<p style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
						Don't have an account?{' '}
						<span style={{ color: '#6366f1', fontWeight: 600 }}>
							Ask your admin for an invite link.
						</span>
					</p>
				</div>
			</div>
		</div>
	);
};
