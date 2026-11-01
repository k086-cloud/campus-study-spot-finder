const preferenceForm = document.getElementById("preference-form");
const submitButton = preferenceForm.querySelector("button[type='submit']");
const recommendationList = document.getElementById("recommendation-list");
const submitLabel = submitButton.textContent.trim();

let locationsPromise = null;

// Fetches locations.json once and caches the promise so the submit handler can
// simply await it. If the request fails, the cache is cleared so that the next
// submit retries instead of staying broken.
function getLocations() {
    if (!locationsPromise) {
        locationsPromise = fetch("locations.json")
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Could not load locations.json (HTTP " + response.status + ")");
                }
                return response.json();
            })
            .catch(function (error) {
                locationsPromise = null;
                throw error;
            });
    }

    return locationsPromise;
}

function loadErrorMessage() {
    if (window.location.protocol === "file:") {
        return "This page has to be served over HTTP to load its data. Run a local web server (see the README) instead of opening the file directly.";
    }

    return "Unable to load study locations. Please check your connection and try again.";
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function calculateRecommendations(locations, userPreferences) {
    // Noise (3), group size (2) and duration (2) always count. Outlets (1) and
    // campus (2) only count when the user asked for them.
    const maxScore =
        7 +
        (userPreferences.needsOutlet ? 1 : 0) +
        (userPreferences.preferredCampus !== "any" ? 2 : 0);

    const scoredLocations = locations.map(function (location) {
        let score = 0;
        const reasons = [];

        if (location.noiseLevel === userPreferences.noiseLevel) {
            score += 3;
            reasons.push("Matches your preferred noise level");
        }

        if (location.groupSizes.includes(userPreferences.groupSize)) {
            score += 2;
            reasons.push("Suitable for your group size");
        }

        if (location.durations.includes(userPreferences.studyDuration)) {
            score += 2;
            reasons.push("Works well for your study duration");
        }

        if (userPreferences.needsOutlet && location.outlets) {
            score += 1;
            reasons.push("Outlets are available");
        }

        if (
            userPreferences.preferredCampus !== "any" &&
            location.campus === userPreferences.preferredCampus
        ) {
            score += 2;
            reasons.push("Located on your preferred campus");
        }

        return {
            ...location,
            score: score,
            matchPercentage: Math.round((score / maxScore) * 100),
            reasons: reasons
        };
    });

    scoredLocations.sort(function (a, b) {
        return b.score - a.score;
    });

    return scoredLocations;
}

function showMessage(message) {
    recommendationList.innerHTML = "<p>" + escapeHtml(message) + "</p>";
}

function renderCard(location, index) {
    const reasonItems = location.reasons
        .map(function (reason) {
            return "<li>" + escapeHtml(reason) + "</li>";
        })
        .join("");

    const mapsUrl =
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(location.name + " Rutgers University New Brunswick");

    const cardClass = index === 0 ? "recommendation-card top-pick" : "recommendation-card";

    return `
        <article class="${cardClass}">
            <div class="recommendation-header">
                <span class="rank">#${index + 1}</span>
                <span class="score">${location.matchPercentage}% Match</span>
            </div>

            <h3>${escapeHtml(location.name)}</h3>

            <p class="campus">${escapeHtml(location.campus)} Campus</p>

            <a class="map-link" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">
                View on Google Maps
            </a>

            <p>${escapeHtml(location.description)}</p>

            <p><strong>Best for:</strong> ${escapeHtml(location.bestFor)}</p>

            <h4>Why it matches:</h4>
            <ul>${reasonItems}</ul>
        </article>
    `;
}

function displayRecommendations(recommendations, userPreferences) {
    if (recommendations.length === 0) {
        showMessage("No study locations are available yet. Please check back later.");
        return;
    }

    const preferredCampus = userPreferences.preferredCampus;

    const hasExactCampusMatch =
        preferredCampus === "any" ||
        recommendations.some(function (location) {
            return location.campus === preferredCampus && location.matchPercentage === 100;
        });

    let matchMessage = "";

    if (!hasExactCampusMatch) {
        matchMessage = `
            <div class="no-match-message">
                <strong>No exact match was found on ${escapeHtml(preferredCampus)} Campus.</strong>
                <p>Here are the closest available study spot options.</p>
            </div>
        `;
    }

    recommendationList.innerHTML =
        matchMessage + recommendations.slice(0, 3).map(renderCard).join("");

    document.getElementById("results").scrollIntoView({ behavior: "smooth" });
}

function readPreferences() {
    return {
        noiseLevel: document.getElementById("noise-level").value,
        needsOutlet: document.getElementById("outlet").value === "yes",
        groupSize: document.getElementById("group-size").value,
        studyDuration: document.getElementById("study-duration").value,
        preferredCampus: document.getElementById("preferred-campus").value
    };
}

preferenceForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const userPreferences = readPreferences();

    submitButton.disabled = true;
    submitButton.textContent = "Finding your spot…";

    try {
        const locations = await getLocations();
        const recommendations = calculateRecommendations(locations, userPreferences);
        displayRecommendations(recommendations, userPreferences);
    } catch (error) {
        console.error(error);
        showMessage(loadErrorMessage());
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = submitLabel;
    }
});

// Start loading right away so results appear instantly on submit.
getLocations().catch(function () {
    // Ignored on purpose: the submit handler reports the error and retries.
});
