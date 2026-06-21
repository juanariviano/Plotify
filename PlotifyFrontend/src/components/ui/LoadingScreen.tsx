import { useEffect } from "react";
import type { Props } from "../../types/components";

const LoadingScreen = ({
  canExit,
  onFinish,
}: Props) => {
  const letters = "plotify".split("");

  useEffect(() => {
    if (!canExit || !onFinish) return;

    // tunggu animasi selesai dulu
    const timer = setTimeout(() => {
      onFinish();
    }, 300);

    return () => clearTimeout(timer);

  }, [canExit, onFinish]);

  return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="flex font-bold text-2xl">
        {letters.map((letter, index) => (
          <span
            key={index}
            className="animate-bounce"
            style={{
              animationDelay: `${index * 0.1}s`,
            }}
          >
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
};

export default LoadingScreen;