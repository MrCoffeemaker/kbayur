// gradient-effects.js
// Bu kod, tarayıcıda cihazın eğimini kullanarak arka plan gradyanı etkisi oluşturur.
    let targetAngle = 135; // Başlangıç açısı
    let currentAngle = 135;

    function animateGradient() {
      // Easing ile yavaş yaklaşma
      currentAngle += (targetAngle - currentAngle) * 0.05;

      document.documentElement.style.setProperty("--angle", `${currentAngle.toFixed(2)}deg`);
      requestAnimationFrame(animateGradient);
    }

    animateGradient(); // Animasyonu başlat

    function handleOrientation(event) {
      const gamma = event.gamma || 0; // [-90, 90]
      const beta = event.beta || 0;   // [-180, 180]

      // İdeal açı hesaplama
      targetAngle = 90 + gamma + beta / 2;
    }

    // iOS izin kontrolü
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === "granted") {
            window.addEventListener("deviceorientation", handleOrientation);
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener("deviceorientation", handleOrientation);
    }
