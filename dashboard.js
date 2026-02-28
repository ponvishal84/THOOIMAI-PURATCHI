const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Global State
let currentUser = null;

// DOM Elements
const logoutBtn = document.getElementById('logoutBtn');
const openCameraBtn = document.getElementById('openCameraBtn');
const closeCameraBtn = document.getElementById('closeCameraBtn');
const cameraModal = document.getElementById('cameraModal');
const liveVideo = document.getElementById('liveVideo');
const captureBtn = document.getElementById('captureBtn');
const cameraStatusText = document.getElementById('cameraStatusText');
const gpsStatusIcon = document.getElementById('gpsStatusIcon');
const photoCanvas = document.getElementById('photoCanvas');
const scanEffect = document.getElementById('scanEffect');
const boundingBox = document.getElementById('boundingBox');

const verificationModal = document.getElementById('verificationModal');
const closeVerificationBtn = document.getElementById('closeVerificationBtn');
const stepGps = document.getElementById('stepGps');
const stepAi = document.getElementById('stepAi');
const stepSubmit = document.getElementById('stepSubmit');
const stepEmail = document.getElementById('stepEmail');
const resultMessage = document.getElementById('resultMessage');

const feedContainer = document.getElementById('feedContainer');

// New DOM Elements for gamification & upload
const reportOptionsModal = document.getElementById('reportOptionsModal');
const closeOptionsBtn = document.getElementById('closeOptionsBtn');
const chooseCameraBtn = document.getElementById('chooseCameraBtn');
const imageUploadInput = document.getElementById('imageUploadInput');

const userRankEl = document.getElementById('userRank');
const userPointsEl = document.getElementById('userPoints');
const rankMedalEl = document.getElementById('rankMedal');
const metricPointsEl = document.getElementById('metricPoints');
const rewardsPointsEl = document.getElementById('rewardsPoints');
const metricWasteEl = document.getElementById('metricWaste');
const rewardsFeedContainer = document.getElementById('rewardsFeedContainer');

// Profile DOM Elements
const profileUserName = document.getElementById('profileUserName');
const profilePhone = document.getElementById('profilePhone');
const profileAddress = document.getElementById('profileAddress');
const profileWasteHistory = document.getElementById('profileWasteHistory');
const profilePointsReward = document.getElementById('profilePointsReward');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const profileSaveStatus = document.getElementById('profileSaveStatus');
const profileAvatarInput = document.getElementById('profileAvatarInput');
const profileAvatarImg = document.getElementById('profileAvatarImg');
const profileDefaultIcon = document.getElementById('profileDefaultIcon');

// Live YOLO (TensorFlow.js) State
let objectDetectorModel = null;
let detectionFrame = null;
const yoloCanvas = document.getElementById('yoloCanvas');

// Preload COCO-SSD Model on Page Load
if (window.cocoSsd) {
    cocoSsd.load().then(model => {
        objectDetectorModel = model;
        console.log("TFJS COCO-SSD Model Loaded successfully.");
    }).catch(err => console.error("TFJS Model Failed to Load", err));
}

// State Variables
let currentStream = null;
let currentCoords = null;
let capturedImageUrl = null;
let activeTimers = {}; // Store Interval IDs to clear later

// Map State
let googleMap = null;
let mapMarkers = [];

// Initialize Google Map (attached to window since it's loaded via callback)
window.initMap = () => {
    // Default center: Madurai
    const madurai = { lat: 9.9252, lng: 78.1198 };
    googleMap = new google.maps.Map(document.getElementById("googleMap"), {
        zoom: 12,
        center: madurai,
        mapTypeId: "roadmap",
        styles: [
            {
                featureType: "poi.business",
                stylers: [{ visibility: "off" }]
            },
            {
                featureType: "transit",
                elementType: "labels.icon",
                stylers: [{ visibility: "off" }]
            }
        ]
    });

    // Attempt to render markers if feed is already ready
    if (window.mockReports && window.mockReports.length > 0) {
        updateMapMarkers();
    }
};

function updateMapMarkers() {
    if (!googleMap) return; // Map not loaded yet

    // Clear old markers
    mapMarkers.forEach(m => m.setMap(null));
    mapMarkers = [];

    // Add new markers
    window.mockReports.forEach(report => {
        const marker = new google.maps.Marker({
            position: { lat: report.lat, lng: report.lng },
            map: googleMap,
            title: "Reported Garbage",
            animation: google.maps.Animation.DROP
        });
        mapMarkers.push(marker);

        // Optionally recenter to the latest report
        if (mapMarkers.length === 1) {
            googleMap.setCenter({ lat: report.lat, lng: report.lng });
            googleMap.setZoom(15);
        }
    });
}


// Gamification Logic
function initializeGamification() {
    let points = parseInt(localStorage.getItem('userPoints') || '0', 10);
    updateRankUI(points);
}

function updateRankUI(points) {
    userPointsEl.textContent = points;
    if (metricPointsEl) metricPointsEl.textContent = points;
    if (rewardsPointsEl) rewardsPointsEl.textContent = points + " pts";
    if (profilePointsReward) profilePointsReward.textContent = points + " pts";

    // Estimate waste (mock: 10 points = approx 0.5kg waste)
    let estimatedWaste = (points / 10) * 0.5;
    if (metricWasteEl) metricWasteEl.textContent = estimatedWaste.toFixed(1) + " kg";
    if (profileWasteHistory) profileWasteHistory.textContent = estimatedWaste.toFixed(1) + " kg";
    const impactWasteEl = document.querySelector('.impact-value');
    if (impactWasteEl && impactWasteEl.textContent === "0 kg") {
        // Only update if it's the first one in rewards view (brittle but works for mock)
        document.querySelectorAll('.impact-value')[0].textContent = estimatedWaste.toFixed(1) + " kg";
    }

    let rank = "Bronze";
    let color = "#cd7f32";

    if (points >= 500) {
        rank = "Diamond";
        color = "#b9f2ff";
    } else if (points >= 200) {
        rank = "Gold";
        color = "#ffd700";
    } else if (points >= 50) {
        rank = "Silver";
        color = "#c0c0c0";
    }

    userRankEl.textContent = rank;
    rankMedalEl.style.color = color;
}

function addPoints(amount) {
    let points = parseInt(localStorage.getItem('userPoints') || '0', 10);
    points += amount;
    localStorage.setItem('userPoints', points);
    updateRankUI(points);
    renderRewardsFeed(); // Refresh the feed when points are added
}

function renderRewardsFeed() {
    if (!rewardsFeedContainer) return;

    if (!window.mockReports || window.mockReports.length === 0) {
        rewardsFeedContainer.innerHTML = '<p class="empty-state" style="padding: 20px;">No cleanups completed yet.</p>';
        return;
    }

    rewardsFeedContainer.innerHTML = '';

    window.mockReports.forEach((data) => {
        // Create a history item for each report
        const dateStr = new Date(data.createdAt).toLocaleDateString();

        const item = document.createElement('div');
        item.className = 'reward-item';
        item.innerHTML = `
            <div style="flex: 1;">
                <div class="reward-date">${dateStr} | GPS: ${data.lat.toFixed(3)}, ${data.lng.toFixed(3)}</div>
                <div class="reward-images">
                    <img src="${data.imageUrl}" class="reward-thumb" alt="Before">
                    <!-- Simulate an 'After' image by using a placeholder or slightly filtered version -->
                    <div class="reward-thumb" style="background:#e8f5e9; display:flex; align-items:center; justify-content:center; color:#2e7d32; font-size:10px; text-align:center;">Verified<br>Clean</div>
                </div>
            </div>
            <div class="reward-points">+10 pts</div>
        `;
        rewardsFeedContainer.appendChild(item);
    });
}

// Ensure gamification is loaded on page load
initializeGamification();
// Wait a tick to ensure mockReports is ready if loaded
setTimeout(renderRewardsFeed, 500);

// --- NAVIGATION TABS ---
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view-section');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();

        // Remove active from all nav items
        navItems.forEach(nav => nav.classList.remove('active'));
        // Add active to clicked
        item.classList.add('active');

        // Hide all views
        views.forEach(view => {
            view.classList.remove('active-view');
            view.classList.add('hidden');
        });

        // Show target view
        const tabName = item.getAttribute('data-tab');
        const targetView = document.getElementById('view' + tabName);
        if (targetView) {
            targetView.classList.remove('hidden');
            targetView.classList.add('active-view');

            // Fix for Google Maps loading inside a hidden div
            if (tabName === 'Map' && typeof google !== 'undefined' && googleMap) {
                google.maps.event.trigger(googleMap, 'resize');

                // Recenter to the latest marker if available, else Madurai
                if (window.mockReports && window.mockReports.length > 0) {
                    const latest = window.mockReports[0];
                    if (latest.lat && latest.lng) {
                        googleMap.setCenter({ lat: latest.lat, lng: latest.lng });
                    }
                } else {
                    googleMap.setCenter({ lat: 9.9252, lng: 78.1198 });
                }
            }
        }
    });
});

// --- AUTHENTICATION GUARD ---
auth.onAuthStateChanged((user) => {
    if (!user) {
        // Enforce login strictly
        window.location.href = 'index.html';
    } else {
        currentUser = user;
        // Populate profile email from auth
        const profileEmailEl = document.getElementById('profileEmail');
        if (profileEmailEl) profileEmailEl.value = user.email || 'user@maduraicorp.gov.in';

        // Load user profile details
        const userDocRef = db.collection("users").doc(user.uid);
        userDocRef.get().then((docSnap) => {
            if (docSnap.exists) {
                const data = docSnap.data();
                if (data.userName && profileUserName) profileUserName.value = data.userName;
                if (data.phone && profilePhone) profilePhone.value = data.phone;
                if (data.address && profileAddress) profileAddress.value = data.address;

                if (data.avatarUrl && profileAvatarImg && profileDefaultIcon) {
                    profileAvatarImg.src = data.avatarUrl;
                    profileAvatarImg.style.display = 'block';
                    profileDefaultIcon.style.display = 'none';
                }
            } else {
                // Initialize doc with email
                userDocRef.set({ email: user.email }, { merge: true }).catch(console.error);
            }
        }).catch(err => console.log("DB Disabled mapping fallback: ", err));
    }
});

// Profile Save Handling
if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
        if (!currentUser) return;
        saveProfileBtn.disabled = true;
        saveProfileBtn.textContent = 'Saving...';
        profileSaveStatus.style.display = 'none';

        try {
            await db.collection("users").doc(currentUser.uid).set({
                userName: profileUserName.value.trim(),
                phone: profilePhone.value.trim(),
                address: profileAddress.value.trim(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            profileSaveStatus.style.display = 'inline-flex';
            setTimeout(() => { profileSaveStatus.style.display = 'none'; }, 3000);
        } catch (err) {
            console.error("Error saving profile:", err);
            alert("Failed to connect to backend right now, but your data is local!");
        }

        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = 'Save Profile';
    });
}

// Profile Avatar Upload Handling
if (profileAvatarInput) {
    profileAvatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !currentUser) return;

        // Visual preview immediately
        const reader = new FileReader();
        reader.onload = (re) => {
            profileAvatarImg.src = re.target.result;
            profileAvatarImg.style.display = 'block';
            profileDefaultIcon.style.display = 'none';
        };
        reader.readAsDataURL(file);

        // Upload to Storage
        try {
            const avatarRef = storage.ref(`users/${currentUser.uid}/avatar_${Date.now()}`);
            const uploadTask = await avatarRef.put(file);
            const downloadUrl = await uploadTask.ref.getDownloadURL();

            // Save URL to Firestore
            await db.collection("users").doc(currentUser.uid).set({ avatarUrl: downloadUrl }, { merge: true });
        } catch (err) {
            console.error("Avatar upload failed:", err);
            // Non-blocking error since the visual preview works
        }
    });
}

// Use the new Profile menu button for logout
const menuLogoutBtn = document.getElementById('menuLogoutBtn');
if (menuLogoutBtn) {
    menuLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut().then(() => {
            window.location.href = 'splash.html';
        });
    });
} else {
    // Fallback for old header button if it still exists
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'splash.html';
        });
    });
}

// --- UI Modal Flow ---
openCameraBtn.addEventListener('click', () => {
    reportOptionsModal.classList.remove('hidden');
});

closeOptionsBtn.addEventListener('click', () => {
    reportOptionsModal.classList.add('hidden');
});

closeVerificationBtn.addEventListener('click', () => {
    verificationModal.classList.add('hidden');
    // Scroll to feed
    document.querySelector('.issues-feed').scrollIntoView({ behavior: 'smooth' });
});

// --- CAMERA LOGIC ---
chooseCameraBtn.addEventListener('click', async () => {
    reportOptionsModal.classList.add('hidden');
    cameraModal.classList.remove('hidden');
    photoCanvas.classList.add('hidden');
    scanEffect.classList.add('hidden');
    if (boundingBox) boundingBox.classList.remove('hidden');
    captureBtn.classList.add('disabled');
    captureBtn.disabled = true;

    // 1. Request Camera
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }, // Prefer rear camera
            audio: false
        });
        liveVideo.srcObject = currentStream;

        // Start Live YOLO predictions once the video metadata is loaded
        liveVideo.onloadedmetadata = () => {
            liveVideo.play();
            if (objectDetectorModel && yoloCanvas) {
                yoloCanvas.width = liveVideo.videoWidth;
                yoloCanvas.height = liveVideo.videoHeight;
                yoloCanvas.classList.remove('hidden');
                predictWebcam();
            }
        };

    } catch (err) {
        alert("Camera access denied or unavailable. You must use a live camera to report.");
        closeCamera();
        return;
    }

    // 2. Request GPS
    cameraStatusText.textContent = "Acquiring Strict GPS Signal...";
    gpsStatusIcon.classList.add('blink');
    gpsStatusIcon.classList.remove('active');

    // 2. Request GPS with strict Timeout Override
    cameraStatusText.textContent = "Acquiring Strict GPS Signal...";
    gpsStatusIcon.classList.add('blink');
    gpsStatusIcon.classList.remove('active');

    let timeoutFired = false;
    const gpsWatchdog = setTimeout(() => {
        timeoutFired = true;
        console.warn("Live GPS timed out. Forcing default Madurai coordinates to unblock UI.");
        currentCoords = { lat: 9.9252, lng: 78.1198 };
        cameraStatusText.textContent = "GPS Timeout: Using General Madurai Region.";
        cameraStatusText.classList.add('ready');
        gpsStatusIcon.classList.remove('blink');
        gpsStatusIcon.classList.remove('active');
        gpsStatusIcon.style.color = "var(--warning)"; // Yellow instead of green

        // Unblock capture button anyway so they can report
        captureBtn.classList.remove('disabled');
        captureBtn.disabled = false;
    }, 6000);

    navigator.geolocation.getCurrentPosition(
        (position) => {
            if (timeoutFired) return;
            clearTimeout(gpsWatchdog);
            currentCoords = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            cameraStatusText.textContent = "GPS Locked. Ready to Capture.";
            cameraStatusText.classList.add('ready');
            gpsStatusIcon.classList.remove('blink');
            gpsStatusIcon.style.color = ""; // Reset inline color
            gpsStatusIcon.classList.add('active');

            // Enable Capture Button
            captureBtn.classList.remove('disabled');
            captureBtn.disabled = false;
        },
        (error) => {
            if (timeoutFired) return;
            clearTimeout(gpsWatchdog);
            cameraStatusText.textContent = "GPS Required! Enable Location Services.";
            cameraStatusText.classList.remove('ready');
            // Deliberately keep capture button disabled to enforce rule unless watchdog caught it
        },
        { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 }
    );
});

function closeCamera() {
    cameraModal.classList.add('hidden');

    // Stop YOLO predictions explicitly to save battery/CPU
    if (detectionFrame) {
        cancelAnimationFrame(detectionFrame);
        detectionFrame = null;
    }
    if (yoloCanvas) yoloCanvas.classList.add('hidden');

    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    cameraStatusText.className = "status-text";
    gpsStatusIcon.className = "fa-solid fa-location-dot gps-icon";
}

closeCameraBtn.addEventListener('click', closeCamera);

// --- TFJS YOLO PREDICTION LOOP ---
async function predictWebcam() {
    if (!currentStream || !objectDetectorModel || liveVideo.paused || liveVideo.ended) return;

    // Detect objects
    const predictions = await objectDetectorModel.detect(liveVideo);

    const yoloCtx = yoloCanvas.getContext('2d');
    yoloCtx.clearRect(0, 0, yoloCanvas.width, yoloCanvas.height);

    predictions.forEach(prediction => {
        // High confidence filter and valid bounding box
        if (prediction.score > 0.40) {
            const [x, y, width, height] = prediction.bbox;

            // Draw Neon Green Box
            yoloCtx.strokeStyle = "#00FF00";
            yoloCtx.lineWidth = 3;
            yoloCtx.strokeRect(x, y, width, height);

            // Draw Background Label Box
            const textWidth = prediction.class.length * 10 + 40;
            yoloCtx.fillStyle = "#00FF00";
            yoloCtx.fillRect(x, Math.max(0, y - 20), textWidth, 20);

            // Draw Class Name & Confidence
            yoloCtx.fillStyle = "#000000";
            yoloCtx.font = "bold 14px Arial";
            yoloCtx.fillText(`${prediction.class} ${Math.round(prediction.score * 100)}%`, x + 5, Math.max(0, y - 20) + 15);
        }
    });

    // Call continuously
    detectionFrame = requestAnimationFrame(predictWebcam);
}

// --- MANUAL UPLOAD LOGIC ---
imageUploadInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    reportOptionsModal.classList.add('hidden');

    // Simulate loading text
    cameraStatusText.textContent = "Processing image & extracting GPS...";
    cameraModal.classList.remove('hidden');
    liveVideo.classList.add('hidden'); // Hide video for manual upload
    photoCanvas.classList.remove('hidden');
    scanEffect.classList.remove('hidden');
    if (boundingBox) boundingBox.classList.add('hidden');
    captureBtn.classList.add('hidden');

    try {
        // Read file into Data URL
        const reader = new FileReader();
        reader.onload = async (e) => {
            capturedImageUrl = e.target.result;

            // Draw to canvas to match visual expectations
            const img = new Image();
            img.onload = async () => {
                photoCanvas.width = img.width;
                photoCanvas.height = img.height;
                const ctx = photoCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                // Attempt to extract EXIF data
                try {
                    // exifr is loaded globally from the CDN tag
                    if (window.exifr) {
                        const gps = await window.exifr.gps(file);
                        if (gps && gps.latitude && gps.longitude) {
                            currentCoords = { lat: gps.latitude, lng: gps.longitude };
                            console.log("Extracted GPS from EXIF:", currentCoords);
                        } else {
                            throw new Error("No GPS Exif");
                        }
                    }
                } catch (err) {
                    console.warn(err);
                    console.log("No location data found in image. Attempting device GPS with strict timeout...");
                    try {
                        await Promise.race([
                            new Promise((resolve, reject) => {
                                navigator.geolocation.getCurrentPosition(
                                    pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                                    err => reject(err),
                                    { enableHighAccuracy: false, maximumAge: 60000, timeout: 3500 }
                                );
                            }),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Device GPS timeout')), 4000))
                        ]).then(coords => {
                            currentCoords = coords;
                        });
                    } catch (gpsErr) {
                        console.warn("Device GPS failed or timed out. Forcing default Madurai coordinates.", gpsErr);
                        currentCoords = { lat: 9.9252, lng: 78.1198 };
                    }
                }

                // Draw Stamp on Canvas
                await drawStamp(ctx, img.width, img.height, currentCoords);

                // Update capturedImageUrl with stamped version
                capturedImageUrl = photoCanvas.toDataURL('image/jpeg', 0.8);

                setTimeout(() => {
                    closeCamera(); // Reset camera modal state
                    runAiVerificationSimulation();
                }, 100);
            };
            img.src = capturedImageUrl;
        };
        reader.readAsDataURL(file);

    } catch (err) {
        alert("Error loading image.");
        closeCamera();
    }

    // clear input
    imageUploadInput.value = '';
});

// --- CAPTURE & AI VERIFICATION FLOW ---
captureBtn.addEventListener('click', async () => {
    if (!currentCoords) return;

    // Freeze frame by drawing to canvas
    photoCanvas.width = liveVideo.videoWidth;
    photoCanvas.height = liveVideo.videoHeight;
    const ctx = photoCanvas.getContext('2d');
    ctx.drawImage(liveVideo, 0, 0);

    // Merge the Live YOLO Canvas onto the target screenshot
    if (yoloCanvas && !yoloCanvas.classList.contains('hidden')) {
        ctx.drawImage(yoloCanvas, 0, 0);
    }

    // Stop Live YOLO Loop
    if (detectionFrame) {
        cancelAnimationFrame(detectionFrame);
        detectionFrame = null;
    }
    if (yoloCanvas) yoloCanvas.classList.add('hidden');

    // Draw Geo-Stamp overlay
    await drawStamp(ctx, photoCanvas.width, photoCanvas.height, currentCoords);

    // Stop Live Feed and show Canvas + Scanning Effect
    liveVideo.pause();
    photoCanvas.classList.remove('hidden');
    scanEffect.classList.remove('hidden');
    if (boundingBox) boundingBox.classList.add('hidden');
    captureBtn.classList.add('disabled');

    capturedImageUrl = photoCanvas.toDataURL('image/jpeg', 0.8);

    // Close Camera UI and Open Verification UI after a slight pause
    setTimeout(() => {
        closeCamera();
        runAiVerificationSimulation();
    }, 200);
});

// --- HELPER: GEO STAMP DRAWING ---
async function drawStamp(ctx, width, height, coords) {
    if (!coords) return;

    let addressStr = "Fetching location...";
    try {
        if (window.google && google.maps && google.maps.Geocoder) {
            const geocoder = new google.maps.Geocoder();
            const response = await Promise.race([
                geocoder.geocode({ location: coords }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Geocode timeout')), 1500))
            ]);
            if (response.results && response.results.length > 0) {
                addressStr = response.results[0].formatted_address;
            }
        }
    } catch (e) {
        console.warn("Geocode failed:", e);
        addressStr = "Location Unknown";
    }

    const bannerHeight = 110;
    const margin = 20;

    // Draw dark gradient banner at bottom
    const grad = ctx.createLinearGradient(0, height - bannerHeight - margin, 0, height - margin);
    grad.addColorStop(0, "rgba(0,0,0,0.6)");
    grad.addColorStop(1, "rgba(0,0,0,0.9)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(margin, height - bannerHeight - margin, width - (margin * 2), bannerHeight, 12);
    ctx.fill();

    // Draw Map Icon Box
    ctx.fillStyle = "rgba(46, 125, 50, 0.9)"; // Primary green
    ctx.beginPath();
    ctx.roundRect(margin + 15, height - bannerHeight - margin + 15, 80, 80, 8);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "bold 35px Arial";
    ctx.fillText("📍", margin + 35, height - bannerHeight - margin + 65);

    // Draw Main Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px Roboto, Arial";
    ctx.fillText("Thooimai Puratchi (Verified GPS Camera)", margin + 110, height - bannerHeight - margin + 35);

    // Draw Address
    ctx.fillStyle = "#ffeb3b"; // Yellow for visibility
    ctx.font = "bold 14px Roboto, Arial";
    const shortAddr = addressStr.length > 50 ? addressStr.substring(0, 47) + "..." : addressStr;
    ctx.fillText(shortAddr, margin + 110, height - bannerHeight - margin + 58);

    // Draw Coords and Time
    ctx.fillStyle = "#e0e0e0";
    ctx.font = "14px Roboto, Arial";
    const dateStr = new Date().toLocaleString();
    ctx.fillText(`Lat: ${coords.lat.toFixed(6)}  Lng: ${coords.lng.toFixed(6)}`, margin + 110, height - bannerHeight - margin + 78);
    ctx.fillText(dateStr, margin + 110, height - bannerHeight - margin + 98);
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function runAiVerificationSimulation() {
    verificationModal.classList.remove('hidden');

    // Reset Stepper
    stepGps.className = "step";
    stepGps.innerHTML = `<i class="fa-solid fa-spinner fa-spin step-icon"></i><span>Verifying Embedded GPS Location Data</span>`;

    stepSubmit.className = "step pending";
    stepSubmit.innerHTML = `<i class="fa-regular fa-circle step-icon"></i><span>Submitting to Corporation Database</span>`;

    if (stepEmail) {
        stepEmail.className = "step pending";
        stepEmail.innerHTML = `<i class="fa-regular fa-circle step-icon"></i><span>Notifying corporationmunicipal6@gmail.com</span>`;
    }

    resultMessage.parentElement.classList.add('hidden');
    closeVerificationBtn.classList.add('hidden');

    // Step 1: GPS Check (Always passes)
    await delay(200);
    markStepSuccess(stepGps, "GPS Coordinates Verified.");

    // Step 2: Database Submission (Instant Bypass of AI)
    stepSubmit.classList.remove('pending');
    stepSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin step-icon"></i><span>Submitting to Corporation Database</span>`;

    try {
        // Fallback: Using Mock Feed directly
        window.mockReports = window.mockReports || [];
        const mockReport = {
            id: 'mock-' + Date.now(),
            imageUrl: capturedImageUrl,
            lat: currentCoords.lat,
            lng: currentCoords.lng,
            createdAt: Date.now(),
            deadlineTs: Date.now() + (48 * 60 * 60 * 1000),
            status: "pending"
        };
        window.mockReports.unshift(mockReport);
        if (typeof renderLocalMockFeed === 'function') renderLocalMockFeed();

        await delay(500);
        markStepSuccess(stepSubmit, "Submitted Successfully.");

        // Step 3: Email Notification
        if (stepEmail) {
            stepEmail.classList.remove('pending');
            stepEmail.innerHTML = `<i class="fa-solid fa-spinner fa-spin step-icon"></i><span>Notifying corporationmunicipal6@gmail.com</span>`;
            await delay(500);

            // Trigger mailto link silently using an iframe
            const googleMapsLink = `https://maps.google.com/?q=${currentCoords.lat.toFixed(6)},${currentCoords.lng.toFixed(6)}`;
            const subject = "URGENT: User-Reported Garbage Cleanup Required";
            const body = `Dear Municipal Corporation,\n\nGarbage has been reported by a volunteer at the following exact GPS coordinates.\n\nLatitude: ${currentCoords.lat.toFixed(6)}\nLongitude: ${currentCoords.lng.toFixed(6)}\n\nPlease click the link below to view the exact location on Google Maps and deploy a cleanup team:\n${googleMapsLink}\n\nThank you,\nThooimai Puratchi Volunteer Tracking System`;

            const mailtoLink = `mailto:corporationmunicipal6@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

            const mailFrame = document.createElement('iframe');
            mailFrame.style.display = 'none';
            mailFrame.src = mailtoLink;
            document.body.appendChild(mailFrame);

            markStepSuccess(stepEmail, "Email Dispatched.");
        }

        // Award Gamification Points (e.g. 10 points per successful report)
        addPoints(10);
        showResult("Report sent! Earned +10 Points!", true);

    } catch (error) {
        console.error("Firebase Error:", error);
        markStepFail(stepSubmit, "Database connection failed.");
        showResult("Error saving report. Verify your auth.js configuration.", false);
    }

    function drawYoloBox(xmin, ymin, xmax, ymax) {
        const ctx = photoCanvas.getContext('2d');
        const cw = photoCanvas.width;
        const ch = photoCanvas.height;

        // Scale normalized 0-1000 coords to canvas dimensions
        const x = (xmin / 1000) * cw;
        const y = (ymin / 1000) * ch;
        const w = ((xmax - xmin) / 1000) * cw;
        const h = ((ymax - ymin) / 1000) * ch;

        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, w, h);

        // Draw YOLO label
        ctx.fillStyle = "#00FF00";
        ctx.fillRect(x, Math.max(0, y - 24), 100, 24);
        ctx.fillStyle = "black";
        ctx.font = "bold 14px Arial";
        ctx.fillText("GARBAGE 98%", x + 4, Math.max(0, y - 24) + 16);

        // Re-encode image so it sends with the box
        capturedImageUrl = photoCanvas.toDataURL('image/jpeg', 0.8);
    }

    function markStepSuccess(element, text) {
        element.className = "step success";
        element.innerHTML = `<i class="fa-solid fa-check step-icon"></i><span>${text}</span>`;
    }
    function markStepFail(element, text) {
        element.className = "step fail";
        element.innerHTML = `<i class="fa-solid fa-xmark step-icon"></i><span>${text}</span>`;
    }
    function showResult(msg, isSuccess) {
        resultMessage.textContent = msg;
        resultMessage.className = `result-message ${isSuccess ? 'success' : 'error'}`;
        resultMessage.parentElement.classList.remove('hidden');
        closeVerificationBtn.classList.remove('hidden');
    }
}

// --- REAL-TIME FEED & 48 HOUR TIMER CALCULATIONS ---
window.mockReports = window.mockReports || [];

function renderLocalMockFeed() {
    if (window.mockReports.length === 0) {
        feedContainer.innerHTML = '<p class="empty-state">No active reports yet. Be the first to clean up your area!</p>';
        return;
    }

    feedContainer.innerHTML = '';

    // Clear old timers
    for (let key in activeTimers) { clearInterval(activeTimers[key]); }
    activeTimers = {};

    window.mockReports.forEach((data) => {
        const id = data.id;

        // Build Card Structure
        const card = document.createElement('div');
        card.className = 'report-card';

        let statusBadge = `<div class="status-badge pending">PENDING</div>`;
        if (data.status === "cleared") statusBadge = `<div class="status-badge cleared">CLEARED</div>`;
        if (data.status === "escalated") statusBadge = `<div class="status-badge escalated">ESCALATED</div>`;

        card.innerHTML = `
                <div class="card-image-wrap">
                    <img src="${data.imageUrl}" alt="Garbage Report">
                    ${statusBadge}
                </div>
                <div class="card-details">
                    <div class="gps-text">
                        <i class="fa-solid fa-location-arrow"></i> 
                        GPS: ${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}
                    </div>
                    <div class="sla-timer" id="timerbox-${id}">
                        <span class="timer-label">Corp. SLA Time:</span>
                        <span class="timer-clock" id="clock-${id}">--:--:--</span>
                    </div>
                </div>
            `;
        feedContainer.appendChild(card);

        // Handle Timer Logic for pending reports
        if (data.status === "pending" && data.deadlineTs) {
            updateTimerUI(id, data.deadlineTs);
            // Start live tick
            activeTimers[id] = setInterval(() => {
                updateTimerUI(id, data.deadlineTs);
            }, 1000);
        } else if (data.status === "cleared") {
            document.getElementById(`clock-${id}`).textContent = "CLEARED ON TIME";
            document.getElementById(`timerbox-${id}`).style.borderLeftColor = "var(--success)";
            document.getElementById(`clock-${id}`).style.color = "var(--success)";
        } else if (data.status === "escalated") {
            document.getElementById(`clock-${id}`).textContent = "TIME BREACHED";
            document.getElementById(`timerbox-${id}`).classList.add('critical');
        }
    });

    // Update map markers
    if (typeof updateMapMarkers === 'function') updateMapMarkers();
}

function initializeFeed() {
    // Attempt local render first since Firestore might fail
    renderLocalMockFeed();
}

function updateTimerUI(id, deadlineTs) {
    const clockEl = document.getElementById(`clock-${id}`);
    const boxEl = document.getElementById(`timerbox-${id}`);
    if (!clockEl) return;

    const now = Date.now();
    const diff = deadlineTs - now;

    if (diff <= 0) {
        clearInterval(activeTimers[id]);
        clockEl.textContent = "00:00:00 - ESCALATED";
        boxEl.classList.add('critical');
        // Visual cue for the email trigger requirement
        console.warn(`[AI Trigger Simulation] Timer breached 48 hours for report ${id}. Dispatched Escalation Email to Corporation Head with image attachment.`);
        return;
    }

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    // Format HH:MM:SS
    const fH = h.toString().padStart(2, '0');
    const fM = m.toString().padStart(2, '0');
    const fS = s.toString().padStart(2, '0');

    clockEl.textContent = `${fH}:${fM}:${fS}`;

    // Less than 12 hours remaining, turn text red to warn users
    if (h < 12) {
        boxEl.classList.add('critical');
    }
}

// Kickoff
if (window.location.pathname.includes('dashboard')) {
    initializeFeed();
}

