<script lang="ts">
  import { onMount } from "svelte";
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";

  let {
    visible = $bindable(true),
    progress = $bindable(0),
    message = $bindable("Loading..."),
  }: {
    visible?: boolean;
    progress?: number;
    message?: string;
  } = $props();

  // Animated progress bar
  const animatedProgress = tweened(0, {
    duration: 300,
    easing: cubicOut,
  });

  // Update animated progress when progress changes
  $effect(() => {
    animatedProgress.set(progress);
  });

  // Particle system state
  let particles = $state<Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    color: string;
  }>>([]);

  let animationFrame: number;

  onMount(() => {
    // Initialize particles
    particles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.8 + 0.2,
      color: ["#ff6b35", "#f7931e", "#ffd700", "#ff4757", "#ff3838"][Math.floor(Math.random() * 5)],
    }));

    // Animate particles
    function animateParticles() {
      particles = particles.map(particle => ({
        ...particle,
        x: particle.x + particle.vx,
        y: particle.y + particle.vy,
        // Wrap around screen
        x: particle.x > window.innerWidth ? 0 : particle.x < 0 ? window.innerWidth : particle.x,
        y: particle.y > window.innerHeight ? 0 : particle.y < 0 ? window.innerHeight : particle.y,
      }));
      
      if (visible) {
        animationFrame = requestAnimationFrame(animateParticles);
      }
    }

    animateParticles();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  });
</script>

{#if visible}
  <div 
    class="loading-screen"
    role="dialog"
    aria-label="Loading content"
    aria-live="polite"
  >
    <!-- Animated background with gradient -->
    <div class="background-gradient"></div>
    
    <!-- Floating particles -->
    <div class="particles-container">
      {#each particles as particle (particle.id)}
        <div
          class="particle"
          style="
            left: {particle.x}px;
            top: {particle.y}px;
            width: {particle.size}px;
            height: {particle.size}px;
            background-color: {particle.color};
            opacity: {particle.opacity};
          "
        ></div>
      {/each}
    </div>

    <!-- Central loading content -->
    <div class="loading-content">
      <!-- Animated dragon/flame icon -->
      <div class="loading-icon">
        <div class="flame flame-1"></div>
        <div class="flame flame-2"></div>
        <div class="flame flame-3"></div>
        <div class="dragon-eye"></div>
      </div>

      <!-- Loading text -->
      <h1 class="loading-title">
        ZachHandley's Portfolio
      </h1>
      
      <p class="loading-message">
        {message}
      </p>

      <!-- Progress bar -->
      <div class="progress-container">
        <div class="progress-bar">
          <div 
            class="progress-fill"
            style="width: {$animatedProgress}%"
          ></div>
        </div>
        <span class="progress-text">
          {Math.round($animatedProgress)}%
        </span>
      </div>

      <!-- Animated dots -->
      <div class="loading-dots">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>
  </div>
{/if}

<style>
  .loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: #0a0a0a;
  }

  .background-gradient {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: 
      radial-gradient(circle at 20% 50%, rgba(255, 107, 53, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 80% 50%, rgba(255, 71, 87, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 40% 80%, rgba(255, 215, 0, 0.2) 0%, transparent 50%),
      linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
    animation: gradientShift 8s ease-in-out infinite;
  }

  @keyframes gradientShift {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  .particles-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .particle {
    position: absolute;
    border-radius: 50%;
    filter: blur(1px);
    animation: sparkle 3s ease-in-out infinite;
  }

  @keyframes sparkle {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.5); opacity: 0.3; }
  }

  .loading-content {
    text-align: center;
    color: white;
    z-index: 10;
    max-width: 400px;
    padding: 2rem;
  }

  .loading-icon {
    position: relative;
    width: 80px;
    height: 80px;
    margin: 0 auto 2rem;
  }

  .flame {
    position: absolute;
    background: linear-gradient(45deg, #ff6b35, #f7931e, #ffd700);
    border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
    animation: flicker 2s ease-in-out infinite;
  }

  .flame-1 {
    width: 30px;
    height: 50px;
    top: 15px;
    left: 25px;
    animation-delay: 0s;
  }

  .flame-2 {
    width: 25px;
    height: 40px;
    top: 20px;
    left: 45px;
    animation-delay: 0.3s;
  }

  .flame-3 {
    width: 20px;
    height: 35px;
    top: 25px;
    left: 15px;
    animation-delay: 0.6s;
  }

  .dragon-eye {
    position: absolute;
    width: 8px;
    height: 8px;
    background: #ff4757;
    border-radius: 50%;
    top: 30px;
    left: 35px;
    box-shadow: 0 0 10px #ff4757, 0 0 20px #ff4757;
    animation: eyeGlow 2s ease-in-out infinite;
  }

  @keyframes flicker {
    0%, 100% { 
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
    25% { 
      transform: scale(1.1) rotate(2deg);
      opacity: 0.8;
    }
    50% { 
      transform: scale(0.9) rotate(-1deg);
      opacity: 0.9;
    }
    75% { 
      transform: scale(1.05) rotate(1deg);
      opacity: 0.85;
    }
  }

  @keyframes eyeGlow {
    0%, 100% { 
      box-shadow: 0 0 10px #ff4757, 0 0 20px #ff4757;
      opacity: 1;
    }
    50% { 
      box-shadow: 0 0 20px #ff4757, 0 0 40px #ff4757, 0 0 60px #ff4757;
      opacity: 0.8;
    }
  }

  .loading-title {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 1rem;
    background: linear-gradient(45deg, #ffd700, #ff6b35, #ff4757);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: titleGlow 3s ease-in-out infinite;
  }

  @keyframes titleGlow {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.2); }
  }

  .loading-message {
    font-size: 1.1rem;
    margin-bottom: 2rem;
    opacity: 0.9;
    animation: fadeInOut 2s ease-in-out infinite;
  }

  @keyframes fadeInOut {
    0%, 100% { opacity: 0.9; }
    50% { opacity: 0.6; }
  }

  .progress-container {
    margin-bottom: 2rem;
  }

  .progress-bar {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff6b35, #f7931e, #ffd700);
    border-radius: 3px;
    transition: width 0.3s ease;
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
    animation: progressGlow 2s ease-in-out infinite;
  }

  @keyframes progressGlow {
    0%, 100% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.5); }
    50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 30px rgba(255, 107, 53, 0.3); }
  }

  .progress-text {
    font-size: 0.9rem;
    opacity: 0.8;
    font-weight: 500;
  }

  .loading-dots {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    background: #ffd700;
    border-radius: 50%;
    animation: dotBounce 1.4s ease-in-out infinite both;
  }

  .dot:nth-child(1) { animation-delay: -0.32s; }
  .dot:nth-child(2) { animation-delay: -0.16s; }
  .dot:nth-child(3) { animation-delay: 0s; }

  @keyframes dotBounce {
    0%, 80%, 100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    40% {
      transform: scale(1.2);
      opacity: 1;
    }
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .loading-content {
      padding: 1rem;
      max-width: 300px;
    }
    
    .loading-title {
      font-size: 1.5rem;
    }
    
    .loading-icon {
      width: 60px;
      height: 60px;
    }
    
    .flame-1 {
      width: 22px;
      height: 38px;
      top: 11px;
      left: 19px;
    }
    
    .flame-2 {
      width: 18px;
      height: 30px;
      top: 15px;
      left: 34px;
    }
    
    .flame-3 {
      width: 15px;
      height: 26px;
      top: 19px;
      left: 11px;
    }
    
    .dragon-eye {
      width: 6px;
      height: 6px;
      top: 23px;
      left: 26px;
    }
  }
</style>