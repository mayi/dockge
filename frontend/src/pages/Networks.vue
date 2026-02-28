<template>
    <transition name="slide-fade" appear>
        <div>
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h1 class="mb-0">{{ $t("networks") }}</h1>
                <div class="d-flex gap-2">
                    <button class="btn btn-primary btn-sm" @click="showCreateDialog = true">
                        <font-awesome-icon icon="plus" class="me-1" /> {{ $t("createNetwork") }}
                    </button>
                    <button class="btn btn-normal btn-sm" @click="loadNetworks">
                        <font-awesome-icon icon="rotate" class="me-1" /> {{ $t("refresh") }}
                    </button>
                </div>
            </div>

            <div v-if="loading" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>

            <div v-else-if="networks.length === 0" class="text-center py-4 text-muted">
                {{ $t("noNetworks") }}
            </div>

            <div v-else class="shadow-box">
                <table class="table table-hover mb-0">
                    <thead>
                        <tr>
                            <th>{{ $t("networkName") }}</th>
                            <th>{{ $t("driver") }}</th>
                            <th>{{ $t("scope") }}</th>
                            <th style="width: 120px;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="net in networks" :key="net.name">
                            <td>{{ net.name }}</td>
                            <td><span class="badge bg-secondary">{{ net.driver }}</span></td>
                            <td>{{ net.scope }}</td>
                            <td>
                                <button
                                    class="btn btn-outline-danger btn-sm"
                                    :disabled="isProtected(net.name)"
                                    :title="isProtected(net.name) ? $t('defaultNetworkWarning') : ''"
                                    @click="confirmRemove(net.name)"
                                >
                                    <font-awesome-icon icon="trash" />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Create Network Modal -->
            <div v-if="showCreateDialog" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">{{ $t("createNetwork") }}</h5>
                            <button type="button" class="btn-close" @click="showCreateDialog = false"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">{{ $t("networkName") }}</label>
                                <input v-model="newNetwork.name" class="form-control" type="text" placeholder="my-network" />
                            </div>
                            <div class="mb-3">
                                <label class="form-label">{{ $t("driver") }}</label>
                                <select v-model="newNetwork.driver" class="form-select">
                                    <option value="bridge">bridge</option>
                                    <option value="overlay">overlay</option>
                                    <option value="macvlan">macvlan</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">{{ $t("subnet") }} <span class="text-muted small">(optional)</span></label>
                                <input v-model="newNetwork.subnet" class="form-control" type="text" placeholder="172.20.0.0/16" />
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-normal" @click="showCreateDialog = false">{{ $t("cancel") }}</button>
                            <button type="button" class="btn btn-primary" :disabled="!newNetwork.name" @click="createNetwork">{{ $t("Create") }}</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Confirm Remove Modal -->
            <div v-if="removeTarget" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">{{ $t("removeNetwork") }}</h5>
                            <button type="button" class="btn-close" @click="removeTarget = null"></button>
                        </div>
                        <div class="modal-body">
                            {{ $t("removeNetworkMsg") }}
                            <div class="mt-2"><strong>{{ removeTarget }}</strong></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-normal" @click="removeTarget = null">{{ $t("cancel") }}</button>
                            <button type="button" class="btn btn-danger" @click="removeNetwork">{{ $t("Confirm") }}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script>
export default {
    data() {
        return {
            networks: [],
            loading: true,
            showCreateDialog: false,
            removeTarget: null,
            newNetwork: {
                name: "",
                driver: "bridge",
                subnet: "",
            },
        };
    },
    mounted() {
        this.loadNetworks();
    },
    methods: {
        loadNetworks() {
            this.loading = true;
            this.$root.emitAgent("", "getDockerNetworkList", (res) => {
                this.loading = false;
                if (res.ok) {
                    this.networks = res.networks || [];
                } else {
                    this.$root.toastRes(res);
                }
            });
        },
        isProtected(name) {
            return ["bridge", "host", "none"].includes(name);
        },
        confirmRemove(name) {
            this.removeTarget = name;
        },
        removeNetwork() {
            const name = this.removeTarget;
            this.removeTarget = null;
            this.$root.emitAgent("", "removeDockerNetwork", name, (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.loadNetworks();
                }
            });
        },
        createNetwork() {
            const data = {
                name: this.newNetwork.name,
                driver: this.newNetwork.driver,
                subnet: this.newNetwork.subnet || undefined,
            };
            this.$root.emitAgent("", "createDockerNetwork", data, (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.showCreateDialog = false;
                    this.newNetwork = { name: "", driver: "bridge", subnet: "" };
                    this.loadNetworks();
                }
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.shadow-box {
    border-radius: 16px;
    overflow: hidden;
}

.table {
    th {
        font-weight: 600;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    td {
        vertical-align: middle;
    }
}
</style>
