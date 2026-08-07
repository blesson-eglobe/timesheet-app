import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { Avatar } from "../components/ui/Avatar";

export const Settings: React.FC = () => {
	const { role, currentUser, updateCurrentUser } =
		useAppStore();
	const navigate = useNavigate();

	const [showHints, setShowHints] = useState(false);
	const [name, setName] = useState(currentUser.name);
	const [email, setEmail] = useState(currentUser.email);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploadMessage, setUploadMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);

	useEffect(() => {
		setName(currentUser.name);
		setEmail(currentUser.email);
	}, [currentUser]);

	const [dailyTarget, setDailyTarget] = useState("8");
	const [timezone, setTimezone] = useState("Asia/Kolkata");
	const [weekStart, setWeekStart] = useState("Monday");
	const [notifSubmission, setNotifSubmission] = useState(true);
	const [notifApproval, setNotifApproval] = useState(true);
	const [notifReminder, setNotifReminder] = useState(false);

	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			setUploadMessage({
				type: "error",
				text: "Please select a valid image file (PNG, JPG, WEBP).",
			});
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			setUploadMessage({
				type: "error",
				text: "Image size should be less than 5MB.",
			});
			return;
		}

		const reader = new FileReader();
		reader.onload = (evt) => {
			const dataUrl = evt.target?.result as string;
			if (dataUrl) {
				updateCurrentUser({ avatar: dataUrl });
				setUploadMessage({
					type: "success",
					text: "Profile picture updated successfully!",
				});
				setTimeout(() => setUploadMessage(null), 3500);
			}
		};
		reader.readAsDataURL(file);
	};

	const handleRemovePhoto = () => {
		updateCurrentUser({ avatar: "" });
		if (fileInputRef.current) fileInputRef.current.value = "";
		setUploadMessage({ type: "success", text: "Profile picture removed." });
		setTimeout(() => setUploadMessage(null), 3000);
	};

	const handleSaveProfile = () => {
		updateCurrentUser({ name, email });
		setUploadMessage({
			type: "success",
			text: "Profile details saved successfully!",
		});
		setTimeout(() => setUploadMessage(null), 3000);
	};

	const Toggle: React.FC<{
		checked: boolean;
		onChange: (v: boolean) => void;
	}> = ({ checked, onChange }) => (
		<label className="settings__toggle">
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
			/>
			<div className="settings__toggle-track">
				<div className="settings__toggle-thumb" />
			</div>
		</label>
	);

	return (
		<div className="page-inner">
			<div className="page-header">
				<div className="page-header__title">Settings</div>
				<div className="page-header__subtitle">
					Manage your account and preferences
				</div>
			</div>

			<div className="settings">
				{/* Profile */}
				<div className="settings__section">
					<div className="settings__section-title">Profile</div>
					<div className="settings__section-desc">
						Update your personal information
					</div>

					<div className="settings__avatar-row">
						<div
							className="settings__avatar-wrapper"
							onClick={() => fileInputRef.current?.click()}
							title="Click to upload profile photo"
						>
							<Avatar
								src={currentUser.avatar}
								initials={currentUser.initials}
								color={currentUser.color}
								size="xl"
							/>
						</div>
						<div>
							<div className="settings__user-name">
								{currentUser.name}
							</div>
							<div className="settings__avatar-actions">
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className="settings__avatar-change"
								>
									Change photo
								</button>
								{currentUser.avatar && (
									<button
										type="button"
										onClick={handleRemovePhoto}
										className="settings__avatar-remove"
									>
										Remove photo
									</button>
								)}
							</div>
							<input
								type="file"
								ref={fileInputRef}
								accept="image/*"
								className="settings__file-input"
								onChange={handleImageUpload}
							/>
							{uploadMessage && (
								<div
									className={`settings__upload-msg settings__upload-msg--${uploadMessage.type}`}
								>
									{uploadMessage.text}
								</div>
							)}
						</div>
					</div>

					<div className="settings__form-grid">
						<div className="form-group">
							<label className="form-group__label">Full Name</label>
							<input
								className="form-group__input"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div className="form-group">
							<label className="form-group__label">Email</label>
							<input
								className="form-group__input"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div className="form-group">
							<label className="form-group__label">Department</label>
							<input
								className="form-group__input settings__input-readonly"
								value={currentUser.department}
								readOnly
							/>
						</div>
					</div>
					<button
						className="btn btn--primary btn--sm"
						onClick={handleSaveProfile}
					>
						Save Changes
					</button>
				</div>

				{/* Work Preferences */}
				{role !== "employee" && role !== "manager" && (
					<div className="settings__section">
						<div className="settings__section-title">Work Preferences</div>
						<div className="settings__section-desc">
							Configure your work schedule defaults
						</div>
						<div className="settings__form-grid">
							<div className="form-group">
								<label className="form-group__label">Daily Target Hours</label>
								<input
									className="form-group__input"
									type="number"
									value={dailyTarget}
									onChange={(e) => setDailyTarget(e.target.value)}
								/>
							</div>
							<div className="form-group">
								<label className="form-group__label">Timezone</label>
								<select
									className="form-group__select"
									value={timezone}
									onChange={(e) => setTimezone(e.target.value)}
								>
									<option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
									<option value="America/New_York">
										America/New_York (EST)
									</option>
									<option value="Europe/London">Europe/London (GMT)</option>
									<option value="Asia/Singapore">Asia/Singapore (SGT)</option>
								</select>
							</div>
							<div className="form-group">
								<label className="form-group__label">Week Starts On</label>
								<select
									className="form-group__select"
									value={weekStart}
									onChange={(e) => setWeekStart(e.target.value)}
								>
									<option>Monday</option>
									<option>Sunday</option>
								</select>
							</div>
						</div>
						<button className="btn btn--primary btn--sm">
							Save Preferences
						</button>
					</div>
				)}

				{/* Notifications */}
				<div className="settings__section">
					<div className="settings__section-title">Notifications</div>
					<div className="settings__section-desc">
						Choose what updates you want to receive
					</div>
					{[
						{
							label: "Timesheet Submissions",
							desc: "Get notified when team members submit timesheets",
							checked: notifSubmission,
							onChange: setNotifSubmission,
						},
						{
							label: "Approval Updates",
							desc: "Receive updates when your timesheet is approved or rejected",
							checked: notifApproval,
							onChange: setNotifApproval,
						},
						{
							label: "Daily Log Reminders",
							desc: "Remind me to log time at the end of each day",
							checked: notifReminder,
							onChange: setNotifReminder,
						},
					].map((n) => (
						<div className="settings__toggle-row" key={n.label}>
							<div className="settings__toggle-info">
								<span className="settings__toggle-label">{n.label}</span>
								<span className="settings__toggle-desc">{n.desc}</span>
							</div>
							<Toggle checked={n.checked} onChange={n.onChange} />
						</div>
					))}
				</div>

				<div className="settings__section">
					<div className="settings__section-title">Account</div>
					<div className="settings__section-desc">
						Manage your account actions
					</div>
					<button
						className="btn btn--ghost settings__signout-btn"
						onClick={() => navigate("/login")}
					>
						<svg
							width="15"
							height="15"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
						>
							<path d="M6 14H3a1.5 1.5 0 01-1.5-1.5v-9A1.5 1.5 0 013 2h3" />
							<path d="M10.5 11l3.5-3-3.5-3M14 8H6" />
						</svg>
						Sign Out
					</button>
				</div>

	
		{/* About footer */}
		<div className="settings__about-footer">
			<div className="settings__about-footer-top">
				<span className="settings__about-footer-version">eGlobe Timesheet · v1.0.0</span>
				<button 
					type="button"
					className={`settings__about-toggle${showHints ? ' settings__about-toggle--active' : ''}`}
					onClick={() => setShowHints(v => !v)}
					title={showHints ? 'Hide secret hints' : 'Show secret hints'}
					aria-label="Toggle secret hints"
				>
					✦
				</button>
			</div>
			{showHints && (
				<div className="settings__about-eggs">
					<div className="settings__about-eggs-banner">
						<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
							<circle cx="8" cy="8" r="6.5" />
							<path d="M8 7v4M8 5.5v.5" strokeLinecap="round" />
						</svg>
						<span>Type the missing letters anywhere outside text fields to trigger</span>
					</div>
					{([
						{ emoji: '☕', word: 'coffee',       clue: "The developer's fuel" },
						{ emoji: '🔐', word: 'sudo approve', clue: 'Elevated permissions — denied' },
						{ emoji: '🕹️', word: 'konami',       clue: 'Up, up, down, down...' },
					] as const).map(({ emoji, word, clue }) => (
						<div key={word} className="settings__about-egg">
							<span className="settings__about-egg-emoji">{emoji}</span>
							<code className="settings__about-egg-word">
								{word.split(' ').map(p => p[0] + '·'.repeat(p.length - 1)).join(' ')}
							</code>
							<span className="settings__about-egg-clue">{clue}</span>
						</div>
					))}
				</div>
			)}
		</div>
	</div>
	</div>
	);
};
