import React, { useRef, useState } from "react";

interface AvatarProps {
	initials: string;
	avatar?: string;
	src?: string;
	color?: string;
	size?: "xs" | "sm" | "md" | "lg" | "xl";
	tooltip?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
	initials,
	avatar,
	src,
	color = "#2563eb",
	size = "sm",
	tooltip,
}) => {
	const [tipPos, setTipPos] = useState({ top: 0, left: 0 });
	const [imgError, setImgError] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	const imgSrc = src || avatar;

	const handleMouseEnter = () => {
		if (ref.current && tooltip) {
			const rect = ref.current.getBoundingClientRect();
			setTipPos({ top: rect.top - 36, left: rect.left + rect.width / 2 });
		}
	};

	return (
		<div
			className={`avatar-wrapper ${tooltip ? "avatar-tooltip" : ""}`}
			ref={ref}
			onMouseEnter={handleMouseEnter}
		>
			<div
				className={`avatar avatar--${size}`}
				style={{ background: color, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}
			>
				{imgSrc && !imgError ? (
					<img
						src={imgSrc}
						alt={initials}
						onError={() => setImgError(true)}
						style={{ width: "100%", height: "100%", objectFit: "cover" }}
					/>
				) : (
					initials
				)}
			</div>
			{tooltip && (
				<div
					className="avatar-tooltip__tip"
					style={{ top: tipPos.top, left: tipPos.left }}
				>
					{tooltip}
				</div>
			)}
		</div>
	);
};

interface AvatarStackProps {
	members: Array<{ initials: string; color: string; name: string }>;
	max?: number;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
	members,
	max = 4,
}) => {
	const visible = members.slice(0, max);
	const extra = members.length - max;
	return (
		<div className="avatar-stack">
			{visible.map((m, i) => (
				<div key={i} className="avatar-stack-item" style={{ zIndex: 10 - i }}>
					<Avatar
						initials={m.initials}
						color={m.color}
						size="sm"
						tooltip={m.name}
					/>
				</div>
			))}
			{extra > 0 && (
				<div className="avatar-stack-item" style={{ zIndex: 0 }}>
					<div className="avatar avatar--sm" style={{ background: "#9ca3af" }}>
						+{extra}
					</div>
				</div>
			)}
		</div>
	);
};
