/*
 File: script.js
 Demo behavior for the YouTube clone:
 - Theme toggle (persisted in localStorage)
 - Populate category chips
 - Generate demo video data (using Picsum & Pravatar)
 - Filter videos by category & search (debounced)
 - Accessible interactions and lazy-loaded images
*/

(() => {
    // Config
    const CATEGORIES = [
        "All",
        "Music",
        "Gaming",
        "News",
        "Sports",
        "Education",
        "Comedy",
        "Technology",
        "Lifestyle",
    ];
    const VIDEO_COUNT = 36;

    // DOM
    const body = document.body;
    const themeToggle = document.getElementById("themeToggle");
    const categoryList = document.getElementById("categoryList");
    const videosGrid = document.getElementById("videosGrid");
    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");

    // State
    let selectedCategory = "All";
    let videos = [];

    // Utilities
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const pick = (arr) => arr[rand(0, arr.length - 1)];
    const slugify = (s) =>
        s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const formatViews = (n) => {
        if (n >= 1e9) return (n / 1e9).toFixed(1) + "B views";
        if (n >= 1e6) return (n / 1e6).toFixed(1) + "M views";
        if (n >= 1e3) return (n / 1e3).toFixed(1) + "K views";
        return n + " views";
    };

    const timeAgo = (days) => {
        if (days < 1) return "Today";
        if (days === 1) return "1 day ago";
        if (days < 30) return `${days} days ago`;
        if (days < 365) return `${Math.floor(days / 30)} months ago`;
        return `${Math.floor(days / 365)} years ago`;
    };

    // Theme
    const THEMES = {
        light: { icon: "🌙", label: "Switch to dark theme" },
        dark: { icon: "☀️", label: "Switch to light theme" },
    };

    function applyTheme(theme) {
        body.setAttribute("data-theme", theme);
        themeToggle.textContent = THEMES[theme].icon;
        themeToggle.title = THEMES[theme].label;
        localStorage.setItem("ytcl_theme", theme);
    }

    function toggleTheme() {
        const current = body.getAttribute("data-theme") || "light";
        applyTheme(current === "light" ? "dark" : "light");
    }

    // Data generation
    function generateVideos(count) {
        const sampleTitles = [
            "Relaxing Lo-fi Beats",
            "Top 10 JavaScript Tricks",
            "Epic Gameplay Highlights",
            "Breaking News Update",
            "Daily Workout Routine",
            "Stand-up Comedy Set",
            "How to Build a Portfolio",
            "Gadget Review: Latest Phone",
            "Cooking: 30-minute Meals",
            "Study With Me — Focus Session",
            "Travel Vlog: Hidden Gems",
            "Beginner Guitar Lesson",
        ];
        const sampleChannels = [
            "TechFlow",
            "DailyBeat",
            "GameStream",
            "NewsNow",
            "FitLife",
            "LaughCast",
            "LearnHub",
            "GizmoLab",
            "KitchenLite",
            "StudyCorner",
            "Wanderer",
            "AcousticSoul",
        ];

        const arr = [];
        for (let i = 0; i < count; i++) {
            const category = pick(CATEGORIES.slice(1)); // exclude "All"
            const title = `${pick(sampleTitles)} ${rand(1, 999)}`;
            const channel = pick(sampleChannels);
            const views = rand(500, 10_000_000);
            const daysAgo = rand(0, 1200);
            const thumbId = rand(10, 1000);
            const avatarId = rand(1, 70);
            const durationMin = rand(1, 20);
            const durationSec = rand(0, 59);
            const duration = `${durationMin}:${durationSec.toString().padStart(2, "0")}`;

            arr.push({
                id: `vid-${i}-${slugify(title)}`,
                title,
                channel,
                category,
                views,
                daysAgo,
                thumbUrl: `https://picsum.photos/id/${thumbId}/480/270`,
                avatarUrl: `https://i.pravatar.cc/40?img=${avatarId}`,
                duration,
            });
        }
        return arr;
    }

    // Rendering
    function renderCategories() {
        categoryList.innerHTML = "";
        CATEGORIES.forEach((cat) => {
            const btn = document.createElement("button");
            btn.className = "chip";
            btn.type = "button";
            btn.textContent = cat;
            btn.setAttribute("data-category", cat);
            btn.title = `Filter by ${cat}`;
            if (cat === selectedCategory) btn.classList.add("active");
            btn.addEventListener("click", () => {
                selectedCategory = cat;
                // update active classes
                categoryList
                    .querySelectorAll(".chip")
                    .forEach((c) => c.classList.toggle("active", c === btn));
                renderVideos();
            });
            categoryList.appendChild(btn);
        });
    }

    function createVideoCard(video) {
        const card = document.createElement("article");
        card.className = "video-card";
        card.tabIndex = 0;
        card.setAttribute("aria-label", `${video.title} by ${video.channel}`);
        card.innerHTML = `
            <div class="thumb" role="img" aria-label="${video.title}">
                <img loading="lazy" src="${video.thumbUrl}" alt="${video.title}">
                <span class="duration">${video.duration}</span>
            </div>
            <div class="meta">
                <img class="avatar" src="${video.avatarUrl}" alt="${video.channel} avatar" loading="lazy">
                <div class="info">
                    <h3 class="title">${video.title}</h3>
                    <p class="channel">${video.channel}</p>
                    <p class="stats">${formatViews(video.views)} • ${timeAgo(video.daysAgo)}</p>
                </div>
            </div>
        `;
        // keyboard/enter interaction - placeholder action
        card.addEventListener("click", () => {
            // minor simulated navigation: focus and announce
            card.classList.add("playing");
            setTimeout(() => card.classList.remove("playing"), 600);
        });
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                card.click();
            }
        });
        return card;
    }

    function filterVideosByQuery(list, query) {
        if (!query) return list;
        const q = query.toLowerCase().trim();
        return list.filter(
            (v) =>
                v.title.toLowerCase().includes(q) ||
                v.channel.toLowerCase().includes(q) ||
                v.category.toLowerCase().includes(q)
        );
    }

    function renderVideos() {
        videosGrid.innerHTML = "";
        let list = videos.slice();

        if (selectedCategory !== "All") {
            list = list.filter((v) => v.category === selectedCategory);
        }

        const q = searchInput.value || "";
        list = filterVideosByQuery(list, q);

        if (list.length === 0) {
            const empty = document.createElement("p");
            empty.className = "muted";
            empty.textContent = "No videos found matching your search.";
            videosGrid.appendChild(empty);
            return;
        }

        const fragment = document.createDocumentFragment();
        list.forEach((v) => fragment.appendChild(createVideoCard(v)));
        videosGrid.appendChild(fragment);
    }

    // Search (debounced)
    function debounce(fn, wait = 300) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    const onSearchChange = debounce(() => renderVideos(), 250);

    // Initialization
    function init() {
        // Theme init
        const savedTheme = localStorage.getItem("ytcl_theme") || "light";
        applyTheme(savedTheme);

        themeToggle.addEventListener("click", toggleTheme);

        // Generate demo data
        videos = generateVideos(VIDEO_COUNT);

        // Render UI
        renderCategories();
        renderVideos();

        // Search handlers
        searchInput.addEventListener("input", onSearchChange);
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                renderVideos();
            }
        });
        searchBtn.addEventListener(
            "click",
            () => {
                renderVideos();
                searchInput.focus();
            },
            { passive: true }
        );

        // Keyboard accessibility: focus first video when pressing "f" (example)
        document.addEventListener("keydown", (e) => {
            if (e.key.toLowerCase() === "f") {
                const first = videosGrid.querySelector(".video-card");
                if (first) first.focus();
            }
        });
    }

    // Start
    init();
})();