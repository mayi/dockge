<template>
    <div v-if="hasData" class="shadow-box big-padding mb-3">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="mb-0">{{ $t("containerStats") }}</h4>
            <span class="badge bg-secondary">{{ $t("refreshEvery", [intervalSec]) }}</span>
        </div>

        <div class="row g-3">
            <!-- CPU Chart -->
            <div class="col-12 col-md-6">
                <div class="chart-box p-3">
                    <h6 class="text-muted mb-2">{{ $t("cpuUsage") }}</h6>
                    <Line :data="cpuChartData" :options="percentChartOptions" />
                </div>
            </div>

            <!-- Memory Chart -->
            <div class="col-12 col-md-6">
                <div class="chart-box p-3">
                    <h6 class="text-muted mb-2">{{ $t("memoryUsage") }}</h6>
                    <Line :data="memChartData" :options="percentChartOptions" />
                </div>
            </div>
        </div>

        <!-- Per-container detail table -->
        <div class="table-responsive mt-3">
            <table class="table table-sm mb-0">
                <thead>
                    <tr>
                        <th>{{ $t("container") }}</th>
                        <th>CPU %</th>
                        <th>{{ $t("memory") }}</th>
                        <th>Mem %</th>
                        <th>{{ $t("networkIO") }}</th>
                        <th>{{ $t("blockIO") }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(stats, name) in latestStats" :key="name">
                        <td><strong>{{ name }}</strong></td>
                        <td>{{ stats.cpuPercent.toFixed(2) }}%</td>
                        <td>{{ stats.memUsage }}</td>
                        <td>{{ stats.memPercent.toFixed(2) }}%</td>
                        <td>{{ stats.netIO }}</td>
                        <td>{{ stats.blockIO }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
import { Line } from "vue-chartjs";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const MAX_DATA_POINTS = 30;

const CHART_COLORS = [
    "#0d6efd",
    "#198754",
    "#dc3545",
    "#ffc107",
    "#0dcaf0",
    "#6f42c1",
    "#fd7e14",
    "#20c997",
];

// Shared static chart options (non-reactive)
const percentChartOptions = Object.freeze({
    responsive: true,
    maintainAspectRatio: true,
    animation: {
        duration: 300,
    },
    scales: {
        y: {
            beginAtZero: true,
            max: 100,
            ticks: {
                callback: (v) => v + "%",
            },
        },
        x: {
            display: false,
        },
    },
    plugins: {
        legend: {
            position: "bottom",
            labels: {
                boxWidth: 12,
            },
        },
        tooltip: {
            callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`,
            },
        },
    },
    elements: {
        point: {
            radius: 0,
        },
        line: {
            tension: 0.3,
        },
    },
});

export default {
    components: {
        Line,
    },
    props: {
        stackName: {
            type: String,
            required: true,
        },
        endpoint: {
            type: String,
            default: "",
        },
        active: {
            type: Boolean,
            default: false,
        },
    },
    data() {
        return {
            latestStats: {},
            // Pre-built plain chart data objects (replaced on each poll, not mutated)
            cpuChartData: { labels: [], datasets: [] },
            memChartData: { labels: [], datasets: [] },
            percentChartOptions,
            intervalId: null,
            intervalSec: 5,
            hasData: false,
        };
    },
    created() {
        // Non-reactive internal state — keeps Chart.js away from Vue proxies
        this._history = {};
        this._labels = [];
    },
    watch: {
        active(val) {
            if (val) {
                this.startPolling();
            } else {
                this.stopPolling();
            }
        },
    },
    mounted() {
        if (this.active) {
            this.startPolling();
        }
    },
    unmounted() {
        this.stopPolling();
    },
    methods: {
        /**
         * Build a plain (non-proxy) chart data snapshot from internal arrays.
         */
        buildChartData(metric) {
            let serviceNames = Object.keys(this._history);
            return {
                labels: [...this._labels],
                datasets: serviceNames.map((name, i) => ({
                    label: name,
                    data: [...this._history[name][metric]],
                    borderColor: CHART_COLORS[i % CHART_COLORS.length],
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + "20",
                    fill: true,
                    borderWidth: 2,
                })),
            };
        },

        startPolling() {
            this.fetchStats();
            this.intervalId = setInterval(() => {
                this.fetchStats();
            }, this.intervalSec * 1000);
        },

        stopPolling() {
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
        },

        fetchStats() {
            this.$root.emitAgent(this.endpoint, "containerStats", this.stackName, (res) => {
                if (res.ok && res.containerStats) {
                    this.hasData = Object.keys(res.containerStats).length > 0;
                    this.latestStats = res.containerStats;
                    this.pushHistory(res.containerStats);
                }
            });
        },

        pushHistory(stats) {
            let now = new Date();
            let timeLabel = now.getHours().toString().padStart(2, "0") + ":" +
                now.getMinutes().toString().padStart(2, "0") + ":" +
                now.getSeconds().toString().padStart(2, "0");

            this._labels.push(timeLabel);
            if (this._labels.length > MAX_DATA_POINTS) {
                this._labels.shift();
            }

            for (let [name, s] of Object.entries(stats)) {
                if (!this._history[name]) {
                    this._history[name] = {
                        cpuPercent: [],
                        memPercent: [],
                    };
                }
                this._history[name].cpuPercent.push(s.cpuPercent);
                this._history[name].memPercent.push(s.memPercent);

                if (this._history[name].cpuPercent.length > MAX_DATA_POINTS) {
                    this._history[name].cpuPercent.shift();
                    this._history[name].memPercent.shift();
                }
            }

            // Assign fresh plain snapshots — Vue detects the assignment, Chart.js gets clean data
            this.cpuChartData = this.buildChartData("cpuPercent");
            this.memChartData = this.buildChartData("memPercent");
        },
    },
};
</script>

<style scoped>
.chart-box {
    background: var(--bs-body-bg);
    border-radius: 10px;
    border: 1px solid var(--bs-border-color);
}
</style>
