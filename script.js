let studyLocations = [];

async function loadLocations() {
    try {
        const response = await fetch("locations.json");

        if (!response.ok) {
            throw new Error("Could not load location data.");
        }

        studyLocations = await response.json();

        console.log("Study locations loaded:", studyLocations);
    } catch (error) {
        console.error("Error:", error);

        document.getElementById("recommendation-list").innerHTML =
            "<p>Unable to load study locations. Please try again.</p>";
    }
}

loadLocations();

function calculateRecommendations(userPreferences) {
    const scoredLocations = studyLocations.map(function (location) {
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
        if ( userPreferences.preferredCampus !== "any" &&location.campus === userPreferences.preferredCampus) 
{
    score += 2;
    reasons.push("Located on your preferred campus");
}

       const maxScore =
    7 +
    (userPreferences.needsOutlet ? 1 : 0) +
    (userPreferences.preferredCampus !== "any" ? 2 : 0);

const matchPercentage = Math.round((score / maxScore) * 100);

return {
    ...location,
    score: score,
    matchPercentage: matchPercentage,
    reasons: reasons
};
    });

    scoredLocations.sort(function (a, b) {
        return b.score - a.score;
    });

    return scoredLocations;
}

function displayRecommendations(recommendations) {
    const recommendationList =
        document.getElementById("recommendation-list");

    const topRecommendations = recommendations.slice(0, 3);

    recommendationList.innerHTML = topRecommendations
        .map(function (location, index) {
            const reasonItems = location.reasons
                .map(function (reason) {
                    return `<li>${reason}</li>`;
                })
                .join("");
                const mapSearch = encodeURIComponent(
    `${location.name} Rutgers University New Brunswick`
);

const mapsUrl =
    `https://www.google.com/maps/search/?api=1&query=${mapSearch}`;

            return `
                <article class="recommendation-card">
                    <div class="recommendation-header">
                        <span class="rank">#${index + 1}</span>
                        <span class="score">${location.matchPercentage}% Match</span>
                    </div>

                    <h3>${location.name}</h3>

                    <p class="campus">${location.campus} Campus</p>
                    <a
                    class="map-link"
                    href="${mapsUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                    >
                         View on Google Maps
                    </a>

                    <p>${location.description}</p>

                    <p>
                        <strong>Best for:</strong>
                        ${location.bestFor}
                    </p>

                    <h4>Why it matches:</h4>

                    <ul>
                        ${reasonItems}
                    </ul>
                </article>
            `;
        })
        .join("");

    document.getElementById("results").scrollIntoView({
        behavior: "smooth"
    });
}

const preferenceForm = document.getElementById("preference-form");

preferenceForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const userPreferences = {
        noiseLevel: document.getElementById("noise-level").value,
        needsOutlet: document.getElementById("outlet").value === "yes",
        groupSize: document.getElementById("group-size").value,
        studyDuration: document.getElementById("study-duration").value,
        preferredCampus: document.getElementById("preferred-campus").value

    };

    console.log("User preferences:", userPreferences);

    const recommendations = calculateRecommendations(userPreferences);

    console.table(recommendations);

    displayRecommendations(recommendations);
});