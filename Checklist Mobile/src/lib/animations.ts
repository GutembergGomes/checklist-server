import { Variants, Transition } from 'framer-motion';

// Spring transitions for natural movement
export const springTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1
};

export const gentleSpring: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 25,
  mass: 1
};

export const bouncySpring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 20,
  mass: 1
};

// Page transition variants
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.4,
      ease: "easeIn"
    }
  }
};

// Card animation variants
export const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  },
  hover: {
    scale: 1.02,
    y: -5,
    transition: gentleSpring
  }
};

// Stagger animation for lists
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

// Fade animation variants
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeInOut"
    }
  }
};

// Scale animation variants
export const scaleVariants: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

// Slide animation variants
export const slideLeft: Variants = {
  hidden: { x: -100, opacity: 0 },
  visible: { x: 0, opacity: 1 }
};

export const slideRight: Variants = {
  hidden: { x: 100, opacity: 0 },
  visible: { x: 0, opacity: 1 }
};

export const slideUp: Variants = {
  hidden: { y: 100, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export const slideDown: Variants = {
  hidden: { y: -100, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

// Floating animation for icons
export const floatingAnimation: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Pulse animation for loading states
export const pulseAnimation: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Glow animation for focus states
export const glowAnimation: Variants = {
  animate: {
    boxShadow: [
      "0 0 0 0 rgba(59, 130, 246, 0)",
      "0 0 20px 10px rgba(59, 130, 246, 0.3)",
      "0 0 0 0 rgba(59, 130, 246, 0)"
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Number count animation
export const countVariants: Variants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

// Progress bar animation
export const progressVariants: Variants = {
  initial: { width: 0 },
  animate: {
    width: "100%",
    transition: {
      duration: 1.5,
      ease: "easeOut"
    }
  }
};

// Error shake animation
export const shakeVariants: Variants = {
  shake: {
    x: [-10, 10, -10, 10, 0],
    transition: {
      duration: 0.5,
      ease: "easeInOut"
    }
  }
};

// Success bounce animation
export const bounceVariants: Variants = {
  bounce: {
    scale: [1, 1.2, 0.9, 1.1, 1],
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

// Morphing animation for shapes
export const morphVariants: Variants = {
  initial: { borderRadius: "8px" },
  morph: {
    borderRadius: ["8px", "50%", "8px"],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};
