// gradient-effects.js
// Bu kod, tarayıcıda cihazın eğimini kullanarak arka plan gradyanı etkisi oluşturur.
    // iOS 13+ permission check
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
      // Android veya destekleyen browserlar
      window.addEventListener("deviceorientation", handleOrientation);
    }

    function handleOrientation(event) {
      const gamma = event.gamma || 0; // left-right [-90,90]
      const beta = event.beta || 0;   // front-back [-180,180]

      // basit şekilde açı belirleyelim
      const angle = Math.floor(90 + gamma + beta / 2);
      document.documentElement.style.setProperty("--angle", `${angle}deg`);
    }
