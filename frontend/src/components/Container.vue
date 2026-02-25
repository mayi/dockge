<template>
    <div class="shadow-box big-padding mb-3 container">
        <div class="row">
            <div class="col-12 col-sm-7">
                <h4>{{ name }}</h4>
                <div class="image mb-2">
                    <template v-if="splitImageTag">
                        <span class="me-1">{{ imageName }}</span><span class="badge bg-primary tag-badge">{{ imageTag }}</span>
                    </template>
                    <template v-else>
                        <span class="me-1">{{ imageName }}:</span><span class="tag">{{ imageTag }}</span>
                    </template>
                </div>
                <div v-if="!isEditMode">
                    <span class="badge me-1" :class="bgStyle">{{ status }}</span>

                    <a v-for="port in (ports ?? envsubstService.ports)" :key="port" :href="parsePort(port).url" target="_blank">
                        <span class="badge me-1 bg-secondary">{{ parsePort(port).display }}</span>
                    </a>
                </div>
            </div>
            <div class="col-12 col-sm-5 mt-2 mt-sm-0">
                <div class="function gap-2">
                    <router-link v-if="!isEditMode" class="btn btn-normal" :to="terminalRouteLink" disabled="">
                        <font-awesome-icon icon="terminal" class="me-1" /> Bash
                    </router-link>
                    <template v-if="isEditMode">
                        <button class="btn rounded-circle px-3 shadow-sm" :class="showConfig ? 'btn-primary' : 'btn-normal'" @click="showConfig = !showConfig" :title="$t('Edit')">
                            <font-awesome-icon icon="pen" />
                        </button>
                        <button class="btn btn-danger rounded-circle px-3 shadow-sm" @click="remove" :title="$t('deleteContainer')">
                            <font-awesome-icon icon="trash" />
                        </button>
                    </template>
                </div>
            </div>
        </div>

        <transition name="slide-fade" appear>
            <div v-if="isEditMode && showConfig" class="config mt-3">
                <!-- Image -->
                <div class="mb-4">
                    <label class="form-label">
                        {{ $t("dockerImage") }}
                    </label>

                    <!-- Combined mode: single input -->
                    <div v-if="!splitImageTag" class="input-group mb-3">
                        <input
                            v-model="service.image"
                            class="form-control"
                            list="image-datalist"
                        />
                    </div>

                    <!-- Split mode: separate name and tag inputs -->
                    <div v-if="splitImageTag" class="row mb-3">
                        <div class="col-8">
                            <label class="form-label small text-muted">{{ $t("imageName") }}</label>
                            <input
                                :value="editImageName"
                                class="form-control"
                                @input="updateImageName($event.target.value)"
                                list="image-datalist"
                            />
                        </div>
                        <div class="col-4">
                            <label class="form-label small text-muted">{{ $t("imageTag") }}</label>
                            <input
                                :value="editImageTag"
                                class="form-control"
                                placeholder="latest"
                                @input="updateImageTag($event.target.value)"
                            />
                        </div>
                    </div>

                    <!-- TODO: Search online: https://hub.docker.com/api/content/v1/products/search?q=louislam%2Fuptime&source=community&page=1&page_size=4 -->
                    <datalist id="image-datalist">
                        <option value="louislam/uptime-kuma:1" />
                    </datalist>
                    <div class="form-text"></div>
                </div>

                <!-- Ports -->
                <div class="mb-4">
                    <label class="form-label">
                        {{ $tc("port", 2) }}
                    </label>
                    <ArrayInput name="ports" :display-name="$t('port')" placeholder="HOST:CONTAINER" />
                </div>

                <!-- Volumes -->
                <div class="mb-4">
                    <label class="form-label">
                        {{ $tc("volume", 2) }}
                    </label>
                    <ArrayInput name="volumes" :display-name="$t('volume')" placeholder="HOST:CONTAINER" />
                </div>

                <!-- Restart Policy -->
                <div class="mb-4">
                    <label class="form-label">
                        {{ $t("restartPolicy") }}
                    </label>
                    <select v-model="service.restart" class="form-select">
                        <option value="always">{{ $t("restartPolicyAlways") }}</option>
                        <option value="unless-stopped">{{ $t("restartPolicyUnlessStopped") }}</option>
                        <option value="on-failure">{{ $t("restartPolicyOnFailure") }}</option>
                        <option value="no">{{ $t("restartPolicyNo") }}</option>
                    </select>
                </div>

                <!-- Environment Variables -->
                <div class="mb-4">
                    <label class="form-label">
                        {{ $tc("environmentVariable", 2) }}
                    </label>
                    <ArrayInput name="environment" :display-name="$t('environmentVariable')" placeholder="KEY=VALUE" />
                </div>

                <!-- Container Name -->
                <div v-if="false" class="mb-4">
                    <label class="form-label">
                        {{ $t("containerName") }}
                    </label>
                    <div class="input-group mb-3">
                        <input
                            v-model="service.container_name"
                            class="form-control"
                        />
                    </div>
                    <div class="form-text"></div>
                </div>

                <!-- Network -->
                <div class="mb-4">
                    <label class="form-label">
                        {{ $tc("network", 2) }}
                    </label>

                    <div v-if="networkList.length === 0 && service.networks && service.networks.length > 0" class="text-warning mb-3">
                        {{ $t("NoNetworksAvailable") }}
                    </div>

                    <ArraySelect name="networks" :display-name="$t('network')" placeholder="Network Name" :options="networkList" />
                </div>

                <!-- Depends on -->
                <div class="mb-4">
                    <label class="form-label">
                        {{ $t("dependsOn") }}
                    </label>
                    <ArrayInput name="depends_on" :display-name="$t('dependsOn')" :placeholder="$t(`containerName`)" />
                </div>
            </div>
        </transition>
    </div>
</template>

<script>
import { defineComponent } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { parseDockerPort } from "../../../common/util-common";

export default defineComponent({
    components: {
        FontAwesomeIcon,
    },
    props: {
        name: {
            type: String,
            required: true,
        },
        isEditMode: {
            type: Boolean,
            default: false,
        },
        first: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            default: "N/A",
        },
        ports: {
            type: Array,
            default: null
        }
    },
    emits: [
    ],
    data() {
        return {
            showConfig: false,
        };
    },
    computed: {

        splitImageTag() {
            return localStorage.getItem("imageTagSplit") === "true";
        },

        editImageName() {
            if (this.service.image) {
                return this.service.image.split(":")[0];
            }
            return "";
        },

        editImageTag() {
            if (this.service.image) {
                const parts = this.service.image.split(":");
                return parts.length > 1 ? parts.slice(1).join(":") : "";
            }
            return "";
        },

        networkList() {
            let list = [];
            for (const networkName in this.jsonObject.networks) {
                list.push(networkName);
            }
            return list;
        },

        bgStyle() {
            if (this.status === "running" || this.status === "healthy") {
                return "bg-primary";
            } else if (this.status === "unhealthy") {
                return "bg-danger";
            } else {
                return "bg-secondary";
            }
        },

        terminalRouteLink() {
            if (this.endpoint) {
                return {
                    name: "containerTerminalEndpoint",
                    params: {
                        endpoint: this.endpoint,
                        stackName: this.stackName,
                        serviceName: this.name,
                        type: "bash",
                    },
                };
            } else {
                return {
                    name: "containerTerminal",
                    params: {
                        stackName: this.stackName,
                        serviceName: this.name,
                        type: "bash",
                    },
                };
            }
        },

        endpoint() {
            return this.$parent.$parent.endpoint;
        },

        stack() {
            return this.$parent.$parent.stack;
        },

        stackName() {
            return this.$parent.$parent.stack.name;
        },

        service() {
            if (!this.jsonObject.services[this.name]) {
                return {};
            }
            return this.jsonObject.services[this.name];
        },

        jsonObject() {
            return this.$parent.$parent.jsonConfig;
        },

        envsubstJSONConfig() {
            return this.$parent.$parent.envsubstJSONConfig;
        },

        envsubstService() {
            if (!this.envsubstJSONConfig.services[this.name]) {
                return {};
            }
            return this.envsubstJSONConfig.services[this.name];
        },

        imageName() {
            if (this.envsubstService.image) {
                return this.envsubstService.image.split(":")[0];
            } else {
                return "";
            }
        },

        imageTag() {
            if (this.envsubstService.image) {
                let tag = this.envsubstService.image.split(":")[1];

                if (tag) {
                    return tag;
                } else {
                    return "latest";
                }
            } else {
                return "";
            }
        },
    },
    mounted() {
        if (this.first) {
            //this.showConfig = true;
        }
    },
    methods: {
        parsePort(port) {
            if (this.stack.endpoint) {
                return parseDockerPort(port, this.stack.primaryHostname);
            } else {
                let hostname = this.$root.info.primaryHostname || location.hostname;
                return parseDockerPort(port, hostname);
            }
        },

        updateImageName(name) {
            const tag = this.editImageTag;
            this.service.image = tag ? `${name}:${tag}` : name;
        },

        updateImageTag(tag) {
            const name = this.editImageName;
            this.service.image = tag ? `${name}:${tag}` : name;
        },

        remove() {
            delete this.jsonObject.services[this.name];
        },
    }
});
</script>

<style scoped lang="scss">
@import "../styles/vars";

.container {
    .image {
        font-size: 0.8rem;
        color: #6c757d;
        word-break: break-all;
        .tag {
            color: #33383b;
        }
        .tag-badge {
            font-size: 0.75rem;
            font-weight: 500;
            vertical-align: middle;
        }
    }

    .function {
        align-content: center;
        display: flex;
        height: 100%;
        width: 100%;
        align-items: center;
        justify-content: end;
    }
}

@media (max-width: 575px) {
    .container .function {
        justify-content: start;
    }
}
</style>
