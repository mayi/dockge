<template>
    <transition ref="tableContainer" name="slide-fade" appear>
        <div v-if="$route.name === 'DashboardHome'">
            <h1 class="mb-3">
                {{ $t("home") }}
            </h1>

            <div class="row first-row">
                <!-- Left -->
                <div class="col-12 col-md-7">
                    <!-- Stats -->
                    <div class="stats-grid mb-4">
                        <div class="stat-card shadow-box">
                            <div class="stat-icon active">
                                <font-awesome-icon icon="check-circle" />
                            </div>
                            <div class="stat-info">
                                <span class="stat-num active">{{ activeNum }}</span>
                                <span class="stat-label">{{ $t("active") }}</span>
                            </div>
                        </div>
                        <div class="stat-card shadow-box">
                            <div class="stat-icon exited">
                                <font-awesome-icon icon="times-circle" />
                            </div>
                            <div class="stat-info">
                                <span class="stat-num exited">{{ exitedNum }}</span>
                                <span class="stat-label">{{ $t("exited") }}</span>
                            </div>
                        </div>
                        <div class="stat-card shadow-box">
                            <div class="stat-icon inactive">
                                <font-awesome-icon icon="pause" />
                            </div>
                            <div class="stat-info">
                                <span class="stat-num inactive">{{ inactiveNum }}</span>
                                <span class="stat-label">{{ $t("inactive") }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Docker Run -->
                    <h2 class="mb-3">{{ $t("Docker Run") }}</h2>
                    <div class="mb-3">
                        <textarea id="name" v-model="dockerRunCommand" type="text" class="form-control docker-run shadow-box" required placeholder="docker run ..."></textarea>
                    </div>

                    <button class="btn-normal btn mb-4" @click="convertDockerRun">{{ $t("Convert to Compose") }}</button>
                </div>
                <!-- Right -->
                <div class="col-12 col-md-5 mt-3 mt-md-0">
                    <!-- Agent List -->
                    <div class="shadow-box big-padding">
                        <h4 class="mb-3">{{ $tc("dockgeAgent", 2) }} <span class="badge bg-warning" style="font-size: 12px;">beta</span></h4>

                        <div v-for="(agent, endpoint) in $root.agentList" :key="endpoint" class="mb-3 agent">
                            <!-- Agent Status -->
                            <template v-if="$root.agentStatusList[endpoint]">
                                <span v-if="$root.agentStatusList[endpoint] === 'online'" class="badge bg-primary me-2">{{ $t("agentOnline") }}</span>
                                <span v-else-if="$root.agentStatusList[endpoint] === 'offline'" class="badge bg-danger me-2">{{ $t("agentOffline") }}</span>
                                <span v-else class="badge bg-secondary me-2">{{ $t($root.agentStatusList[endpoint]) }}</span>
                            </template>

                            <!-- Agent Display Name -->
                            <span v-if="endpoint === ''">{{ $t("currentEndpoint") }}</span>
                            <a v-else :href="agent.url" target="_blank">{{ endpoint }}</a>

                            <!-- Remove Button -->
                            <font-awesome-icon v-if="endpoint !== ''" class="ms-2 remove-agent" icon="trash" @click="confirmRemoveAgent(agent.url)" />
                        </div>

                        <!-- Remove Agent Dialog -->
                        <Confirm ref="confirmRemoveAgentDialog" btnStyle="btn-danger" :yesText="$t('removeAgent')" :noText="$t('cancel')" @yes="doRemoveAgent">
                            <p>{{ removeAgentUrl }}</p>
                            {{ $t("removeAgentMsg") }}
                        </Confirm>

                        <button v-if="!showAgentForm" class="btn btn-normal" @click="showAgentForm = !showAgentForm">{{ $t("addAgent") }}</button>

                        <!-- Add Agent Form -->
                        <form v-if="showAgentForm" @submit.prevent="addAgent">
                            <div class="mb-3">
                                <label for="url" class="form-label">{{ $t("dockgeURL") }}</label>
                                <input id="url" v-model="agent.url" type="url" class="form-control" required placeholder="http://">
                            </div>

                            <div class="mb-3">
                                <label for="username" class="form-label">{{ $t("Username") }}</label>
                                <input id="username" v-model="agent.username" type="text" class="form-control" required>
                            </div>

                            <div class="mb-3">
                                <label for="password" class="form-label">{{ $t("Password") }}</label>
                                <input id="password" v-model="agent.password" type="password" class="form-control" required autocomplete="new-password">
                            </div>

                            <button type="submit" class="btn btn-primary" :disabled="connectingAgent">
                                <template v-if="connectingAgent">{{ $t("connecting") }}</template>
                                <template v-else>{{ $t("connect") }}</template>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </transition>
    <router-view ref="child" />
</template>

<script>
import { statusNameShort } from "../../../common/util-common";
import Confirm from "../components/Confirm.vue";

export default {
    components: {
        Confirm,
    },
    props: {
        calculatedHeight: {
            type: Number,
            default: 0
        }
    },
    data() {
        return {
            page: 1,
            perPage: 25,
            initialPerPage: 25,
            paginationConfig: {
                hideCount: true,
                chunksNavigation: "scroll",
            },
            importantHeartBeatListLength: 0,
            displayedRecords: [],
            dockerRunCommand: "",
            showAgentForm: false,
            removeAgentUrl: "",
            connectingAgent: false,
            agent: {
                url: "http://",
                username: "",
                password: "",
            }
        };
    },

    computed: {
        activeNum() {
            return this.getStatusNum("active");
        },
        inactiveNum() {
            return this.getStatusNum("inactive");
        },
        exitedNum() {
            return this.getStatusNum("exited");
        },
    },

    watch: {
        perPage() {
            this.$nextTick(() => {
                this.getImportantHeartbeatListPaged();
            });
        },

        page() {
            this.getImportantHeartbeatListPaged();
        },
    },

    mounted() {
        this.initialPerPage = this.perPage;

        window.addEventListener("resize", this.updatePerPage);
        this.updatePerPage();
    },

    beforeUnmount() {
        window.removeEventListener("resize", this.updatePerPage);
    },

    methods: {

        addAgent() {
            this.connectingAgent = true;
            this.$root.getSocket().emit("addAgent", this.agent, (res) => {
                this.$root.toastRes(res);

                if (res.ok) {
                    this.showAgentForm = false;
                    this.agent = {
                        url: "http://",
                        username: "",
                        password: "",
                    };
                }

                this.connectingAgent = false;
            });
        },

        removeAgent(url) {
            this.$root.getSocket().emit("removeAgent", url, (res) => {
                if (res.ok) {
                    this.$root.toastRes(res);

                    let urlObj = new URL(url);
                    let endpoint = urlObj.host;

                    // Remove the stack list and status list of the removed agent
                    delete this.$root.allAgentStackList[endpoint];
                }
            });
        },

        confirmRemoveAgent(url) {
            this.removeAgentUrl = url;
            this.$refs.confirmRemoveAgentDialog.show();
        },

        doRemoveAgent() {
            this.removeAgent(this.removeAgentUrl);
        },

        getStatusNum(statusName) {
            let num = 0;

            for (let stackName in this.$root.completeStackList) {
                const stack = this.$root.completeStackList[stackName];
                if (statusNameShort(stack.status) === statusName) {
                    num += 1;
                }
            }
            return num;
        },

        convertDockerRun() {
            if (this.dockerRunCommand.trim() === "docker run") {
                throw new Error("Please enter a docker run command");
            }

            // composerize is working in dev, but after "vite build", it is not working
            // So pass to backend to do the conversion
            this.$root.getSocket().emit("composerize", this.dockerRunCommand, (res) => {
                if (res.ok) {
                    this.$root.composeTemplate = res.composeTemplate;
                    this.$router.push("/compose");
                } else {
                    this.$root.toastRes(res);
                }
            });
        },

        /**
         * Updates the displayed records when a new important heartbeat arrives.
         * @param {object} heartbeat - The heartbeat object received.
         * @returns {void}
         */
        onNewImportantHeartbeat(heartbeat) {
            if (this.page === 1) {
                this.displayedRecords.unshift(heartbeat);
                if (this.displayedRecords.length > this.perPage) {
                    this.displayedRecords.pop();
                }
                this.importantHeartBeatListLength += 1;
            }
        },

        /**
         * Retrieves the length of the important heartbeat list for all monitors.
         * @returns {void}
         */
        getImportantHeartbeatListLength() {
            this.$root.getSocket().emit("monitorImportantHeartbeatListCount", null, (res) => {
                if (res.ok) {
                    this.importantHeartBeatListLength = res.count;
                    this.getImportantHeartbeatListPaged();
                }
            });
        },

        /**
         * Retrieves the important heartbeat list for the current page.
         * @returns {void}
         */
        getImportantHeartbeatListPaged() {
            const offset = (this.page - 1) * this.perPage;
            this.$root.getSocket().emit("monitorImportantHeartbeatListPaged", null, offset, this.perPage, (res) => {
                if (res.ok) {
                    this.displayedRecords = res.data;
                }
            });
        },

        /**
         * Updates the number of items shown per page based on the available height.
         * @returns {void}
         */
        updatePerPage() {
            const tableContainer = this.$refs.tableContainer;
            const tableContainerHeight = tableContainer.offsetHeight;
            const availableHeight = window.innerHeight - tableContainerHeight;
            const additionalPerPage = Math.floor(availableHeight / 58);

            if (additionalPerPage > 0) {
                this.perPage = Math.max(this.initialPerPage, this.perPage + additionalPerPage);
            } else {
                this.perPage = this.initialPerPage;
            }

        },
    },
};
</script>

<style lang="scss" scoped>
@import "../styles/vars";

.stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px !important;
    transition: transform 0.15s ease, box-shadow 0.2s ease;

    &:hover {
        transform: translateY(-2px);
    }
}

.stat-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;

    &.active {
        background: rgba($primary, 0.12);
        color: $primary;
    }

    &.exited {
        background: rgba($danger, 0.12);
        color: $danger;
    }

    &.inactive {
        background: rgba(128, 128, 128, 0.12);
        color: $dark-font-color3;
    }
}

.stat-info {
    display: flex;
    flex-direction: column;
}

.stat-num {
    font-size: 26px;
    font-weight: 700;
    line-height: 1.1;

    &.active {
        color: $primary;
    }

    &.exited {
        color: $danger;
    }

    &.inactive {
        color: $dark-font-color3;
    }
}

.stat-label {
    font-size: 13px;
    color: $dark-font-color3;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.shadow-box {
    padding: 20px;
}

table {
    font-size: 14px;

    tr {
        transition: all ease-in-out 0.2ms;
    }

    @media (max-width: 550px) {
        table-layout: fixed;
        overflow-wrap: break-word;
    }
}

.docker-run {
    border: none;
    font-family: 'JetBrains Mono', monospace;
    font-size: 15px;
}

.first-row .shadow-box {

}

.remove-agent {
    cursor: pointer;
    color: rgba(255, 255, 255, 0.3);
    transition: color 0.15s ease;

    &:hover {
        color: $danger;
    }
}

.agent {
    a {
        text-decoration: none;
    }
}

@media (max-width: 767px) {
    .stats-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
    }

    .stat-card {
        padding: 12px !important;
        gap: 8px;
    }

    .stat-icon {
        width: 36px;
        height: 36px;
        font-size: 14px;
    }

    .stat-num {
        font-size: 20px;
    }

    .stat-label {
        font-size: 11px;
    }
}

@media (max-width: 400px) {
    .stat-card {
        flex-direction: column;
        text-align: center;
        gap: 4px;
        padding: 10px !important;
    }

    .stat-info {
        align-items: center;
    }
}

</style>
