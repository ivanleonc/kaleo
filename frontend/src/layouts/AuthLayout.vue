<template>
  <div class="auth-wrapper">
    <div class="auth-form">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.auth-wrapper {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-app);
  padding: var(--space-4);
}

.auth-form {
  width: 100%;
  max-width: 400px;
}
</style>

<style>
.auth-title {
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1;
  margin: 0;
  color: var(--text-main);
}

.auth-description {
  font-size: var(--text-base);
  color: var(--text-muted);
  margin: 0;
}

.auth-footer-links {
  text-align: center;
  font-size: var(--text-base);
  color: var(--text-muted);
  margin-top: var(--space-2);
}

.auth-footer-links p {
  margin-bottom: var(--space-2);
}

.auth-footer-links a {
  color: var(--text-main);
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 4px;
}
</style>
