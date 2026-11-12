
const form = document.getElementById("checkForm");
const input = document.getElementById("website");
const button = document.getElementById("checkButton");
const result = document.getElementById("result");

let historyData = [];

try {
    historyData = JSON.parse(
        localStorage.getItem("webguard_history") || "[]"
    );
} catch {
    historyData = [];
}

function updateDashboard() {
    document.getElementById("total").textContent = historyData.length;

    document.getElementById("online").textContent =
        historyData.filter(item => item.status === "ONLINE").length;

    document.getElementById("problem").textContent =
        historyData.filter(item => item.status !== "ONLINE").length;

    renderHistory();
}

function renderHistory() {
    const list = document.getElementById("historyList");

    if (historyData.length === 0) {
        list.innerHTML = `
            <tr>
                <td colspan="4" class="empty">
                    Belum ada pemeriksaan.
                </td>
            </tr>`;
        return;
    }

    list.innerHTML = historyData.map(item => `
        <tr>
            <td>${escapeHTML(item.url)}</td>
            <td class="${item.status === "ONLINE" ? "good" : "bad"}">
                ${escapeHTML(item.status)}
            </td>
            <td>${item.code || "-"}</td>
            <td>${escapeHTML(item.time)}</td>
        </tr>
    `).join("");
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function saveHistory(item) {
    historyData.unshift(item);
    historyData = historyData.slice(0, 50);

    localStorage.setItem(
        "webguard_history",
        JSON.stringify(historyData)
    );

    updateDashboard();
}

form.addEventListener("submit", async function(event) {
    event.preventDefault();

    let address = input.value.trim();

    if (!address) {
        alert("Masukkan alamat website!");
        return;
    }

    if (!/^https?:\/\//i.test(address)) {
        address = "https://" + address;
    }

    let parsedURL;

    try {
        parsedURL = new URL(address);

        if (!["http:", "https:"].includes(parsedURL.protocol)) {
            throw new Error("Alamat tidak valid");
        }
    } catch {
        alert("Alamat website tidak valid!");
        return;
    }

    button.disabled = true;
    button.textContent = "Memeriksa...";
    result.classList.remove("hidden");
    result.textContent = "Sedang menghubungi layanan pemeriksaan...";

    const startTime = performance.now();

    try {
        const proxyURL =
            "https://api.allorigins.win/get?url=" +
            encodeURIComponent(parsedURL.href);

        const response = await fetch(proxyURL);

        if (!response.ok) {
            throw new Error("Layanan pemeriksaan tidak tersedia");
        }

        const data = await response.json();

        if (!data.status || !data.status.http_code) {
            throw new Error("Tidak mendapatkan respons website");
        }

        const responseTime = Math.round(
            performance.now() - startTime
        );

        const code = Number(data.status.http_code);

        let status;

        if (code >= 200 && code < 400) {
            status = "ONLINE";
        } else if (code >= 400) {
            status = "HTTP ERROR";
        } else {
            status = "BERMASALAH";
        }

        const item = {
            url: parsedURL.href,
            status: status,
            code: code,
            time: responseTime + " ms",
            date: new Date().toLocaleString("id-ID")
        };

        saveHistory(item);

        result.innerHTML = `
            <h3 class="${status === "ONLINE" ? "good" : "bad"}">
                Status: ${status}
            </h3>
            <p>Alamat: ${escapeHTML(parsedURL.href)}</p>
            <p>Kode HTTP: ${code}</p>
            <p>Waktu respons pemeriksaan: ${responseTime} ms</p>
            <p>Waktu pemeriksaan: ${escapeHTML(item.date)}</p>
        `;

    } catch (error) {
        const item = {
            url: parsedURL.href,
            status: "TIDAK DAPAT DIPERIKSA",
            code: 0,
            time: "-",
            date: new Date().toLocaleString("id-ID")
        };

        saveHistory(item);

        result.innerHTML = `
            <h3 class="bad">Pemeriksaan gagal</h3>
            <p>${escapeHTML(error.message)}</p>
            <p>Website mungkin bermasalah, atau layanan proxy sedang tidak tersedia.</p>
        `;

    } finally {
        button.disabled = false;
        button.textContent = "Periksa Website";
    }
});

document.getElementById("clearHistory").addEventListener("click", function() {
    if (!confirm("Yakin ingin menghapus semua riwayat?")) {
        return;
    }

    historyData = [];
    localStorage.removeItem("webguard_history");
    updateDashboard();
    result.classList.add("hidden");
});

updateDashboard();
