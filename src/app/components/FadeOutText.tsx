import { motion } from "framer-motion";
import React from "react";

type FadeOutTextProps = {
  text: string;
  className?: string;
  onAnimationComplete?: () => void;
};

const FadeOutText: React.FC<FadeOutTextProps> = ({
  text,
  className = "",
  onAnimationComplete,
}) => {
  return (
    <motion.div
      initial={{ 
        filter: "blur(0px)", 
        opacity: 1,
        scale: 1
      }}
      animate={{ 
        filter: "blur(30px)", 
        opacity: 0,
        scale: 1
      }}
      transition={{
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1],
      }}
      onAnimationComplete={onAnimationComplete}
      className={className}
    >
      {text}
    </motion.div>
  );
};

export default FadeOutText;