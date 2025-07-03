const style = `
.loading-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #282c34;
  z-index: 9999;
  flex-direction: column;
}

.loading-logo {
  animation: spin 2s linear infinite;
  height: 40vmin;
  pointer-events: none;
}

.loading-text {
  color: white;
  margin-top: 20px;
  font-family: sans-serif;
  font-size: 1.5rem;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
`

const logoUrl = '/favicon.ico' // Or your logo path

const loadingHtml = `
<div class="loading-container">
  <img src="${logoUrl}" class="loading-logo" alt="logo">
  <p class="loading-text">Loading...</p>
</div>
`

export function useLoading() {
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oStyle.id = 'loading-style'
  oStyle.innerHTML = style
  oDiv.id = 'loading-div'
  oDiv.innerHTML = loadingHtml

  return {
    append: () => {
      document.head.appendChild(oStyle)
      document.body.appendChild(oDiv)
    },
    remove: () => {
      document.head.removeChild(oStyle)
      document.body.removeChild(oDiv)
    },
  }
}
