import { FaWineBottle, FaRecycle, FaLeaf } from "react-icons/fa";
import { LuBadgeDollarSign } from "react-icons/lu";
import { GrTrophy } from "react-icons/gr";
import { ElementType } from "react";

const ICON_SETS: ElementType[][] = [
  [FaWineBottle, LuBadgeDollarSign, FaRecycle, FaLeaf, GrTrophy],
  [FaLeaf, FaWineBottle, GrTrophy, LuBadgeDollarSign, FaRecycle],
  [GrTrophy, FaRecycle, FaWineBottle, FaLeaf, LuBadgeDollarSign],
  [LuBadgeDollarSign, FaLeaf, GrTrophy, FaRecycle, FaWineBottle],
];

export const SectionDivider = ({ variant = 0 }: { variant?: number }) => {
  const icons = ICON_SETS[variant % ICON_SETS.length];
  const direction = variant % 2 === 0 ? "scroll-left" : "scroll-right";
  const items = Array.from({ length: 20 });

  return (
    <div className="my-16 lg:my-24 py-3 overflow-hidden">
      <style>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scroll-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .divider-track {
          display: flex;
          align-items: center;
          width: max-content;
        }
        .divider-track.scroll-left {
          animation: scroll-left 45s linear infinite;
        }
        .divider-track.scroll-right {
          animation: scroll-right 45s linear infinite;
        }
      `}</style>
      <div className={`divider-track ${direction}`}>
        {[...items, ...items].map((_, i) => {
          const Icon = icons[i % icons.length];
          return (
            <Icon
              key={i}
              style={{
                transform: `translateY(${i % 2 === 0 ? "-5px" : "5px"})`,
                opacity: i % 2 === 0 ? 0.9 : 0.35,
                color: "#E2E8F0",
                marginLeft: "12px",
                marginRight: "12px",
                flexShrink: 0,
                width: "28px",
                height: "28px",
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
