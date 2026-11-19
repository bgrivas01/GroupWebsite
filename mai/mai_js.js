const button = document.getElementById('confetti-btn');
const colors = ['#EF476F', '#FFD166', '#ADF7B6', '#FF66D8', '#1BE7FF'];

button.addEventListener('click', () => {
      for (let i = 0; i < 250; i++) {
        createConfetti();
      }
    });

    function createConfetti() {
      const piece = document.createElement('div');
      piece.classList.add('confetti');

      piece.style.left = Math.random() * 100 + 'vw';

      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

      const duration = 2 + Math.random() * 2.5;
      const delay = Math.random() * 0.5;
      piece.style.animationDuration = duration + 's';
      piece.style.animationDelay = delay + 's';

      const drift = (Math.random() - 0.5) * 200 + 'px';
      const rot = Math.random() * 720 + 'deg';
      piece.style.setProperty('--drift', drift);
      piece.style.setProperty('--rot', rot);

      document.body.appendChild(piece);

      setTimeout(() => {
        piece.remove();
      }, (duration + delay) * 1000);
    }