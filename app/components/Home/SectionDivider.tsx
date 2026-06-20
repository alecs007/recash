import { FaWineBottle, FaRecycle, FaLeaf } from "react-icons/fa";
import { LuBadgeDollarSign } from "react-icons/lu";
import { GrTrophy } from "react-icons/gr";
import { ElementType } from "react";

type StyledIcon = {
  Component: ElementType;
  color: string;
};

const ICON_MAP: StyledIcon[] = [
  { Component: FaWineBottle, color: "text-blue-400" },
  { Component: LuBadgeDollarSign, color: "text-lime-400" },
  { Component: FaRecycle, color: "text-green-500" },
  { Component: FaLeaf, color: "text-green-600" },
  { Component: GrTrophy, color: "text-amber-400" },
];

const ICON_SETS = [
  [ICON_MAP[0], ICON_MAP[1], ICON_MAP[2], ICON_MAP[3], ICON_MAP[4]],
  [ICON_MAP[3], ICON_MAP[0], ICON_MAP[4], ICON_MAP[1], ICON_MAP[2]],
  [ICON_MAP[4], ICON_MAP[2], ICON_MAP[0], ICON_MAP[3], ICON_MAP[1]],
  [ICON_MAP[1], ICON_MAP[3], ICON_MAP[4], ICON_MAP[2], ICON_MAP[0]],
];

export const SectionDivider = ({ variant = 0 }: { variant?: number }) => {
  const icons = ICON_SETS[variant % ICON_SETS.length];
  const direction = variant % 2 === 0 ? "scroll-left" : "scroll-right";
  const items = Array.from({ length: 20 });

  return (
    <div className="my-12 lg:my-22 py-3 overflow-hidden">
      <style>{`
        @keyframes scroll-left { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes scroll-right { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
        .divider-track { display: flex; align-items: center; width: max-content; }
        .divider-track.scroll-left { animation: scroll-left 45s linear infinite; }
        .divider-track.scroll-right { animation: scroll-right 45s linear infinite; }
        .divider-track.scroll-left { animation: scroll-left 60s linear infinite; }
        .divider-track.scroll-right { animation: scroll-right 60s linear infinite; }
      `}</style>

      <div className={`divider-track ${direction}`}>
        {[...items, ...items].map((_, i) => {
          const { Component, color } = icons[i % icons.length];
          return (
            <Component
              key={i}
              className={`${color} flex-shrink-0 mx-3`}
              style={{
                transform: `translateY(${i % 2 === 0 ? "-5px" : "5px"})`,
                opacity: i % 2 === 0 ? 0.9 : 0.35,
                width: "32px",
                height: "32px",
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
