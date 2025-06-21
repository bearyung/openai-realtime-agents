import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";

type StreamingBlurTextProps = {
  text: string;
  isStreaming: boolean;
  className?: string;
  delay?: number;
};

const StreamingBlurText: React.FC<StreamingBlurTextProps> = ({
  text,
  isStreaming,
  className = "",
  delay = 200,
}) => {
  // Always start from 0 to ensure animation plays from beginning
  const [displayedWordCount, setDisplayedWordCount] = useState(0);
  const prevTextRef = useRef(text);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    const currentWords = text.split(" ").filter(w => w.length > 0);
    
    // If text has changed
    if (text !== prevTextRef.current) {
      const prevWords = prevTextRef.current.split(" ").filter(w => w.length > 0);
      
      // If this is a completely new text (reset scenario)
      if (currentWords.length < prevWords.length || text === "") {
        // Clear all timeouts
        timeoutsRef.current.forEach(t => clearTimeout(t));
        timeoutsRef.current = [];
        // Only reset if text is truly empty, not just shorter
        if (text === "") {
          setDisplayedWordCount(0);
        } else {
          // Keep displaying existing words up to the new length
          setDisplayedWordCount(currentWords.length);
        }
      } else if (currentWords.length > prevWords.length) {
        // Find newly added words
        const newWordStartIndex = prevWords.length;
        
        // Show previous words immediately if needed
        if (displayedWordCount < prevWords.length) {
          setDisplayedWordCount(prevWords.length);
        }
        
        // Add new words with delay
        const newWords = currentWords.slice(newWordStartIndex);
        newWords.forEach((_, index) => {
          const timeout = setTimeout(() => {
            setDisplayedWordCount(current => {
              const targetCount = newWordStartIndex + index + 1;
              return Math.max(current, targetCount);
            });
          }, index * delay);
          
          timeoutsRef.current.push(timeout);
        });
      }
      
      prevTextRef.current = text;
    }
  }, [text, delay]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const words = text.split(" ").filter(w => w.length > 0);
  const wordsToDisplay = words.slice(0, displayedWordCount);

  return (
    <div className={`${className}`}>
      {wordsToDisplay.map((word, index) => {
        // Create a stable key based only on index and the word itself
        const uniqueKey = `word-${index}-${word}`;
        
        return (
          <motion.span
            key={uniqueKey}
            initial={{ 
              filter: "blur(20px)", 
              opacity: 0,
              scale: 0.9
            }}
            animate={{ 
              filter: "blur(0px)", 
              opacity: 1,
              scale: 1
            }}
            transition={{
              duration: 0.6,
              ease: [0.4, 0, 0.2, 1], // Ease-in-out: slow start, faster finish
              filter: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
            }}
            style={{
              display: "inline-block",
              marginRight: "0.3em",
            }}
          >
            {word}
          </motion.span>
        );
      })}
    </div>
  );
};

export default StreamingBlurText;