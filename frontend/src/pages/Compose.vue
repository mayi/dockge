<template>
    <transition name="slide-fade" appear>
        <div>
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h1 v-if="isAdd" class="mb-0">{{ $t("compose") }}</h1>
                <h1 v-else class="mb-0">
                    <Uptime :stack="globalStack" :pill="true" /> {{ stack.name }}
                    <span v-if="$root.agentCount > 1" class="agent-name">
                        ({{ endpointDisplay }})
                    </span>
                </h1>
                
                <!-- Page Level Actions -->
                <div v-if="stack.isManagedByDockge" class="d-flex gap-2">
                    <template v-if="isEditMode">
                        <button v-if="!isAdd" class="btn btn-normal" :disabled="processing" @click="discardStack">
                            {{ $t("discardStack") }}
                        </button>
                        <button class="btn btn-primary shadow-sm" :disabled="processing" @click="saveStack">
                            <font-awesome-icon icon="save" class="me-1" /> {{ $t("saveStackDraft") }}
                        </button>
                    </template>
                    <template v-else>
                        <button class="btn btn-danger" :disabled="processing" @click="showDeleteDialog = !showDeleteDialog">
                            <font-awesome-icon icon="trash" class="me-1" /> {{ $t("deleteStack") }}
                        </button>
                    </template>
                </div>
            </div>

            <div v-if="stack.isManagedByDockge && !isEditMode" class="mb-4">
                <div class="action-bar d-flex flex-wrap gap-3 align-items-center">
                    
                    <!-- 1. Primary Actions (State/Edit) -->
                    <div v-if="!active" class="d-flex flex-wrap gap-2 align-items-center">
                        <button class="btn btn-primary shadow-sm" :disabled="processing" @click="startStack">
                            <font-awesome-icon icon="play" class="me-1" /> {{ $t("startStack") }}
                        </button>
                    </div>



                    <!-- 2. Lifecycle Operations (Segmented Group) -->
                    <div v-if="active" class="btn-group shadow-sm" role="group" aria-label="Lifecycle Actions">
                        <button class="btn btn-outline-secondary" :disabled="processing" @click="confirmRestart" title="Restart">
                            <font-awesome-icon icon="rotate" class="me-1" /> <span class="d-none d-xl-inline">{{ $t("restartStack") }}</span>
                        </button>
                        <button class="btn btn-outline-secondary" :disabled="processing" @click="confirmUpdate" title="Update">
                            <font-awesome-icon icon="cloud-arrow-down" class="me-1" /> <span class="d-none d-xl-inline">{{ $t("updateStack") }}</span>
                        </button>
                        <button class="btn btn-outline-secondary" :disabled="processing" @click="confirmStop" title="Stop">
                            <font-awesome-icon icon="stop" class="me-1" /> <span class="d-none d-xl-inline">{{ $t("stopStack") }}</span>
                        </button>
                        <button class="btn btn-outline-secondary" :disabled="processing" @click="confirmDown" title="Down">
                            <font-awesome-icon icon="arrow-down" class="me-1" /> <span class="d-none d-xl-inline">{{ $t("downStack") }}</span>
                        </button>
                    </div>

                    <button v-if="!isAdd && endpoint === ''" class="btn btn-outline-secondary" :disabled="processing" @click="backupStack">
                        <font-awesome-icon icon="file" class="me-1" /> <span class="d-none d-xl-inline">{{ $t("backupStack") }}</span>
                    </button>

                    <!-- Separator -->
                    <div class="vr mx-1"></div>

                    <button class="btn btn-outline-secondary" :disabled="processing" @click="enableEditMode">
                        <font-awesome-icon icon="pen" class="me-1" /> <span class="d-none d-xl-inline">{{ $t("editStack") }}</span>
                    </button>

                    <button class="btn btn-outline-secondary" @click="showCompose = !showCompose">
                        <font-awesome-icon :icon="showCompose ? 'eye-slash' : 'eye'" class="me-1" />
                        <span class="d-none d-xl-inline">{{ stack.composeFileName }}</span>
                    </button>

                </div>
            </div>

            <!-- URLs -->
            <div v-if="urls.length > 0" class="mb-4 d-flex gap-2 flex-wrap">
                <a v-for="(url, index) in urls" :key="index" target="_blank" :href="url.url" class="text-decoration-none">
                    <span class="badge bg-primary px-3 py-2 rounded-pill shadow-sm">{{ url.display }}</span>
                </a>
            </div>

            <!-- Progress Terminal -->
            <transition name="slide-fade" appear>
                <div v-show="showProgressTerminal" class="position-relative mb-3">
                    <button class="btn btn-sm btn-dark position-absolute top-0 end-0 m-2" style="z-index: 10; opacity: 0.8;" @click="showProgressTerminal = false">
                        <font-awesome-icon icon="times" class="me-1" /> {{ $t("hide") }}
                    </button>
                    <Terminal
                        ref="progressTerminal"
                        class="terminal"
                        :name="terminalName"
                        :endpoint="endpoint"
                        :rows="progressTerminalRows"
                        @has-data="showProgressTerminal = true; submitted = true;"
                    ></Terminal>
                </div>
            </transition>

            <div v-if="stack.isManagedByDockge" class="row">
                <div :class="showCompose || isEditMode ? 'col-12 col-lg-6' : 'col-12'">
                    <!-- General -->
                    <div v-if="isAdd">
                        <h4 class="mb-3">{{ $t("general") }}</h4>
                        <div class="shadow-box big-padding mb-3">
                            <!-- Stack Name -->
                            <div>
                                <label for="name" class="form-label">{{ $t("stackName") }}</label>
                                <input id="name" v-model="stack.name" type="text" class="form-control" required @blur="stackNameToLowercase">
                                <div class="form-text">{{ $t("Lowercase only") }}</div>
                            </div>

                            <!-- Endpoint -->
                            <div class="mt-3">
                                <label for="name" class="form-label">{{ $t("dockgeAgent") }}</label>
                                <select v-model="stack.endpoint" class="form-select">
                                    <option v-for="(agent, endpoint) in $root.agentList" :key="endpoint" :value="endpoint" :disabled="$root.agentStatusList[endpoint] != 'online'">
                                        ({{ $root.agentStatusList[endpoint] }}) {{ (endpoint) ? endpoint : $t("currentEndpoint") }}
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Containers -->
                    <!-- Containers -->
                    <div class="d-flex align-items-center mb-3" style="min-height: 40px;">
                        <h4 class="mb-0">{{ $tc("container", 2) }}</h4>
                    </div>

                    <div v-if="isEditMode" class="shadow-box mb-3">
                        <div class="input-group">
                            <input
                                v-model="newContainerName"
                                :placeholder="$t(`New Container Name...`)"
                                class="form-control"
                                @keyup.enter="addContainer"
                            />
                            <button class="btn btn-primary" @click="addContainer">
                                <font-awesome-icon icon="plus" class="me-1 d-none d-md-inline" /> {{ $t("addContainer") }}
                            </button>
                        </div>
                    </div>

                    <div ref="containerList" class="shadow-box big-padding mb-3">
                        <Container
                            v-for="(service, name) in jsonConfig.services"
                            :key="name"
                            :name="name"
                            :is-edit-mode="isEditMode"
                            :first="name === Object.keys(jsonConfig.services)[0]"
                            :status="serviceStatusList[name]?.state"
                            :ports="serviceStatusList[name]?.ports"
                        />
                    </div>

                    <!-- Container Resource Stats -->
                    <ContainerStats
                        v-if="!isEditMode && !isAdd"
                        :stack-name="stack.name"
                        :endpoint="endpoint"
                        :active="active"
                    />

                    <!-- General -->
                    <div v-if="isEditMode">
                        <h4 class="mb-3">{{ $t("extra") }}</h4>
                        <div class="shadow-box big-padding mb-3">
                            <!-- URLs -->
                            <div class="mb-4">
                                <label class="form-label">
                                    {{ $tc("url", 2) }}
                                </label>
                                <ArrayInput name="urls" :display-name="$t('url')" placeholder="https://" object-type="x-dockge" />
                            </div>
                        </div>
                    </div>

                    <!-- Combined Terminal Output -->
                    <div v-show="!isEditMode">
                        <h4 class="mb-3">{{ $t("terminal") }}</h4>
                        <div class="shadow-box mb-3 p-0 overflow-hidden">
                            <Terminal
                                ref="combinedTerminal"
                                class="terminal m-0"
                                :name="combinedTerminalName"
                                :endpoint="endpoint"
                                :rows="combinedTerminalRows"
                                :cols="combinedTerminalCols"
                                style="height: 315px; border-radius: 0;"
                            ></Terminal>
                        </div>
                    </div>
                </div>
                <div v-if="showCompose || isEditMode" class="col-12 col-lg-6">
                    <div class="d-flex justify-content-between align-items-center mb-3" style="min-height: 40px;">
                        <h4 class="mb-0">{{ stack.composeFileName }}</h4>
                    </div>

                    <!-- YAML editor -->
                    <div class="shadow-box mb-3 editor-box" :class="{'edit-mode' : isEditMode}">
                        <code-mirror
                            ref="editor"
                            v-model="stack.composeYAML"
                            :extensions="extensions"
                            minimal
                            wrap="true"
                            dark="true"
                            tab="true"
                            :disabled="!isEditMode"
                            :hasFocus="editorFocus"
                            @change="yamlCodeChange"
                        />
                    </div>
                    <div v-if="isEditMode" class="mb-3">
                        {{ yamlError }}
                    </div>

                    <!-- ENV editor -->
                    <div v-if="isEditMode">
                        <h4 class="mb-3">.env</h4>
                        <div class="shadow-box mb-3 editor-box" :class="{'edit-mode' : isEditMode}">
                            <code-mirror
                                ref="editor"
                                v-model="stack.composeENV"
                                :extensions="extensionsEnv"
                                minimal
                                wrap="true"
                                dark="true"
                                tab="true"
                                :disabled="!isEditMode"
                                :hasFocus="editorFocus"
                                @change="yamlCodeChange"
                            />
                        </div>
                    </div>

                    <div v-if="isEditMode">
                        <!-- Volumes -->
                        <div v-if="false">
                            <h4 class="mb-3">{{ $tc("volume", 2) }}</h4>
                            <div class="shadow-box big-padding mb-3">
                            </div>
                        </div>

                        <!-- Networks -->
                        <h4 class="mb-3">{{ $tc("network", 2) }}</h4>
                        <div class="shadow-box big-padding mb-3">
                            <NetworkInput />
                        </div>
                    </div>

                    <!-- <div class="shadow-box big-padding mb-3">
                        <div class="mb-3">
                            <label for="name" class="form-label"> Search Templates</label>
                            <input id="name" v-model="name" type="text" class="form-control" placeholder="Search..." required>
                        </div>

                        <prism-editor v-if="false" v-model="yamlConfig" class="yaml-editor" :highlight="highlighter" line-numbers @input="yamlCodeChange"></prism-editor>
                    </div>-->
                </div>
            </div>

            <div v-if="!stack.isManagedByDockge && !processing">
                {{ $t("stackNotManagedByDockgeMsg") }}
            </div>

            <!-- Delete Dialog -->
            <BModal v-model="showDeleteDialog" :cancelTitle="$t('cancel')" :okTitle="$t('deleteStack')" okVariant="danger" @ok="deleteDialog">
                {{ $t("deleteStackMsg") }}
            </BModal>

            <!-- Confirm Restart -->
            <Confirm ref="confirmRestart" btnStyle="btn-warning" :yesText="$t('restartStack')" :noText="$t('cancel')" @yes="restartStack">
                {{ $t("confirmRestartMsg") }}
            </Confirm>

            <!-- Confirm Stop -->
            <Confirm ref="confirmStop" btnStyle="btn-warning" :yesText="$t('stopStack')" :noText="$t('cancel')" @yes="stopStack">
                {{ $t("confirmStopMsg") }}
            </Confirm>

            <!-- Confirm Update -->
            <Confirm ref="confirmUpdate" btnStyle="btn-primary" :yesText="$t('updateStack')" :noText="$t('cancel')" @yes="updateStack">
                {{ $t("confirmUpdateMsg") }}
            </Confirm>

            <!-- Confirm Down -->
            <Confirm ref="confirmDown" btnStyle="btn-warning" :yesText="$t('downStack')" :noText="$t('cancel')" @yes="downStack">
                {{ $t("confirmDownMsg") }}
            </Confirm>
        </div>
    </transition>
</template>

<script>
import CodeMirror from "vue-codemirror6";
import { yaml } from "@codemirror/lang-yaml";
import { python } from "@codemirror/lang-python";
import { dracula as editorTheme } from "thememirror";
import { lineNumbers, EditorView } from "@codemirror/view";
import { parseDocument, Document } from "yaml";

import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
    COMBINED_TERMINAL_COLS,
    COMBINED_TERMINAL_ROWS,
    copyYAMLComments, envsubstYAML,
    getCombinedTerminalName,
    getComposeTerminalName,
    PROGRESS_TERMINAL_ROWS,
    RUNNING
} from "../../../common/util-common";
import { BModal } from "bootstrap-vue-next";
import NetworkInput from "../components/NetworkInput.vue";
import Confirm from "../components/Confirm.vue";
import ContainerStats from "../components/ContainerStats.vue";
import dotenv from "dotenv";
import { ref } from "vue";

const template = `
services:
  nginx:
    image: nginx:latest
    restart: unless-stopped
    ports:
      - "8080:80"
`;
const envDefault = "# VARIABLE=value #comment";

let yamlErrorTimeout = null;

let serviceStatusTimeout = null;

export default {
    components: {
        NetworkInput,
        FontAwesomeIcon,
        CodeMirror,
        BModal,
        Confirm,
        ContainerStats,
    },
    beforeRouteUpdate(to, from, next) {
        this.exitConfirm(next);
    },
    beforeRouteLeave(to, from, next) {
        this.exitConfirm(next);
    },
    setup() {
        const editorFocus = ref(false);

        const focusEffectHandler = (state, focusing) => {
            editorFocus.value = focusing;
            return null;
        };

        const extensions = [
            editorTheme,
            yaml(),
            lineNumbers(),
            EditorView.focusChangeEffect.of(focusEffectHandler)
        ];

        const extensionsEnv = [
            editorTheme,
            python(),
            lineNumbers(),
            EditorView.focusChangeEffect.of(focusEffectHandler)
        ];

        return { extensions,
            extensionsEnv,
            editorFocus };
    },
    yamlDoc: null,  // For keeping the yaml comments
    data() {
        return {
            jsonConfig: {},
            envsubstJSONConfig: {},
            yamlError: "",
            processing: true,
            showProgressTerminal: false,
            progressTerminalRows: PROGRESS_TERMINAL_ROWS,
            combinedTerminalRows: COMBINED_TERMINAL_ROWS,
            combinedTerminalCols: COMBINED_TERMINAL_COLS,
            stack: {

            },
            serviceStatusList: {},
            isEditMode: false,
            showCompose: true,
            submitted: false,
            showDeleteDialog: false,
            newContainerName: "",
            stopServiceStatusTimeout: false,
        };
    },
    computed: {
        endpointDisplay() {
            return this.$root.endpointDisplayFunction(this.endpoint);
        },

        urls() {
            if (!this.envsubstJSONConfig["x-dockge"] || !this.envsubstJSONConfig["x-dockge"].urls || !Array.isArray(this.envsubstJSONConfig["x-dockge"].urls)) {
                return [];
            }

            let urls = [];
            for (const url of this.envsubstJSONConfig["x-dockge"].urls) {
                let display;
                try {
                    let obj = new URL(url);
                    let pathname = obj.pathname;
                    if (pathname === "/") {
                        pathname = "";
                    }
                    display = obj.host + pathname + obj.search;
                } catch (e) {
                    display = url;
                }

                urls.push({
                    display,
                    url,
                });
            }
            return urls;
        },

        isAdd() {
            return this.$route.path === "/compose" && !this.submitted;
        },

        /**
         * Get the stack from the global stack list, because it may contain more real-time data like status
         * @return {*}
         */
        globalStack() {
            return this.$root.completeStackList[this.stack.name + "_" + this.endpoint];
        },

        status() {
            return this.globalStack?.status;
        },

        active() {
            return this.status === RUNNING;
        },

        terminalName() {
            if (!this.stack.name) {
                return "";
            }
            return getComposeTerminalName(this.endpoint, this.stack.name);
        },

        combinedTerminalName() {
            if (!this.stack.name) {
                return "";
            }
            return getCombinedTerminalName(this.endpoint, this.stack.name);
        },

        networks() {
            return this.jsonConfig.networks;
        },

        endpoint() {
            return this.stack.endpoint || this.$route.params.endpoint || "";
        },

        url() {
            if (this.stack.endpoint) {
                return `/compose/${this.stack.name}/${this.stack.endpoint}`;
            } else {
                return `/compose/${this.stack.name}`;
            }
        },
    },
    watch: {
        "stack.composeYAML": {
            handler() {
                if (this.editorFocus) {
                    console.debug("yaml code changed");
                    this.yamlCodeChange();
                }
            },
            deep: true,
        },

        "stack.composeENV": {
            handler() {
                if (this.editorFocus) {
                    console.debug("env code changed");
                    this.yamlCodeChange();
                }
            },
            deep: true,
        },

        jsonConfig: {
            handler() {
                if (!this.editorFocus) {
                    console.debug("jsonConfig changed");

                    let doc = new Document(this.jsonConfig);

                    // Stick back the yaml comments
                    if (this.yamlDoc) {
                        copyYAMLComments(doc, this.yamlDoc);
                    }

                    this.stack.composeYAML = doc.toString();
                    this.yamlDoc = doc;
                }
            },
            deep: true,
        },

        $route(to, from) {

        }
    },
    mounted() {
        if (this.isAdd) {
            this.processing = false;
            this.isEditMode = true;

            let composeYAML;
            let composeENV;

            if (this.$root.composeTemplate) {
                composeYAML = this.$root.composeTemplate;
                this.$root.composeTemplate = "";
            } else {
                composeYAML = template;
            }
            if (this.$root.envTemplate) {
                composeENV = this.$root.envTemplate;
                this.$root.envTemplate = "";
            } else {
                composeENV = envDefault;
            }

            // Default Values
            this.stack = {
                name: "",
                composeYAML,
                composeENV,
                isManagedByDockge: true,
                endpoint: "",
            };

            this.yamlCodeChange();

        } else {
            this.stack.name = this.$route.params.stackName;
            this.loadStack();
        }

        this.requestServiceStatus();
    },
    unmounted() {

    },
    methods: {
        showProgressTerminalOnAction() {
            this.showProgressTerminal = true;
        },
        startServiceStatusTimeout() {
            clearTimeout(serviceStatusTimeout);
            serviceStatusTimeout = setTimeout(async () => {
                this.requestServiceStatus();
            }, 5000);
        },

        requestServiceStatus() {
            // Do not request if it is add mode
            if (this.isAdd) {
                return;
            }

            this.$root.emitAgent(this.endpoint, "serviceStatusList", this.stack.name, (res) => {
                if (res.ok) {
                    this.serviceStatusList = res.serviceStatusList;
                }
                if (!this.stopServiceStatusTimeout) {
                    this.startServiceStatusTimeout();
                }
            });
        },

        exitConfirm(next) {
            if (this.isEditMode) {
                if (confirm(this.$t("confirmLeaveStack"))) {
                    this.exitAction();
                    next();
                } else {
                    next(false);
                }
            } else {
                this.exitAction();
                next();
            }
        },

        exitAction() {
            console.log("exitAction");
            this.stopServiceStatusTimeout = true;
            clearTimeout(serviceStatusTimeout);

            // Leave Combined Terminal
            console.debug("leaveCombinedTerminal", this.endpoint, this.stack.name);
            this.$root.emitAgent(this.endpoint, "leaveCombinedTerminal", this.stack.name, () => {});
        },

        bindTerminal() {
            this.$refs.progressTerminal?.bind(this.endpoint, this.terminalName);
        },

        loadStack() {
            this.processing = true;
            this.$root.emitAgent(this.endpoint, "getStack", this.stack.name, (res) => {
                if (res.ok) {
                    this.stack = res.stack;
                    this.yamlCodeChange();
                    this.processing = false;
                    this.bindTerminal();
                } else {
                    this.$root.toastRes(res);
                }
            });
        },

        deployStack() {
            this.processing = true;
            this.showProgressTerminalOnAction();

            if (!this.jsonConfig.services) {
                this.$root.toastError("No services found in compose.yaml");
                this.processing = false;
                return;
            }

            // Check if services is object
            if (typeof this.jsonConfig.services !== "object") {
                this.$root.toastError("Services must be an object");
                this.processing = false;
                return;
            }

            let serviceNameList = Object.keys(this.jsonConfig.services);

            // Set the stack name if empty, use the first container name
            if (!this.stack.name && serviceNameList.length > 0) {
                let serviceName = serviceNameList[0];
                let service = this.jsonConfig.services[serviceName];

                if (service && service.container_name) {
                    this.stack.name = service.container_name;
                } else {
                    this.stack.name = serviceName;
                }
            }

            this.bindTerminal();

            this.$root.emitAgent(this.stack.endpoint, "deployStack", this.stack.name, this.stack.composeYAML, this.stack.composeENV, this.isAdd, (res) => {
                this.processing = false;
                this.$root.toastRes(res);

                if (res.ok) {
                    this.isEditMode = false;
                    this.$router.push(this.url);
                }
            });
        },

        saveStack() {
            this.processing = true;
            this.showProgressTerminalOnAction();

            this.$root.emitAgent(this.stack.endpoint, "saveStack", this.stack.name, this.stack.composeYAML, this.stack.composeENV, this.isAdd, (res) => {
                this.processing = false;
                this.$root.toastRes(res);

                if (res.ok) {
                    this.isEditMode = false;
                    this.$router.push(this.url);
                }
            });
        },

        startStack() {
            this.processing = true;
            this.showProgressTerminalOnAction();

            this.$root.emitAgent(this.endpoint, "startStack", this.stack.name, (res) => {
                this.processing = false;
                this.$root.toastRes(res);
            });
        },

        stopStack() {
            this.processing = true;
            this.showProgressTerminalOnAction();

            this.$root.emitAgent(this.endpoint, "stopStack", this.stack.name, (res) => {
                this.processing = false;
                this.$root.toastRes(res);
            });
        },

        downStack() {
            this.processing = true;
            this.showProgressTerminalOnAction();

            this.$root.emitAgent(this.endpoint, "downStack", this.stack.name, (res) => {
                this.processing = false;
                this.$root.toastRes(res);
            });
        },

        restartStack() {
            this.processing = true;
            this.showProgressTerminalOnAction();

            this.$root.emitAgent(this.endpoint, "restartStack", this.stack.name, (res) => {
                this.processing = false;
                this.$root.toastRes(res);
            });
        },

        updateStack() {
            this.processing = true;
            this.showProgressTerminalOnAction();

            this.$root.emitAgent(this.endpoint, "updateStack", this.stack.name, (res) => {
                this.processing = false;
                this.$root.toastRes(res);
            });
        },

        confirmRestart() {
            this.$refs.confirmRestart.show();
        },

        confirmStop() {
            this.$refs.confirmStop.show();
        },

        confirmUpdate() {
            this.$refs.confirmUpdate.show();
        },

        confirmDown() {
            this.$refs.confirmDown.show();
        },

        deleteDialog() {
            this.$root.emitAgent(this.endpoint, "deleteStack", this.stack.name, (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.$router.push("/");
                }
            });
        },

        discardStack() {
            this.loadStack();
            this.isEditMode = false;
        },

        yamlToJSON(yaml) {
            let doc = parseDocument(yaml);
            if (doc.errors.length > 0) {
                throw doc.errors[0];
            }

            const config = doc.toJS() ?? {};

            // Check data types
            // "services" must be an object
            if (!config.services) {
                config.services = {};
            }

            if (Array.isArray(config.services) || typeof config.services !== "object") {
                throw new Error("Services must be an object");
            }

            return {
                config,
                doc,
            };
        },

        yamlCodeChange() {
            try {
                let { config, doc } = this.yamlToJSON(this.stack.composeYAML);

                this.yamlDoc = doc;
                this.jsonConfig = config;

                let env = dotenv.parse(this.stack.composeENV);
                let envYAML = envsubstYAML(this.stack.composeYAML, env);
                this.envsubstJSONConfig = this.yamlToJSON(envYAML).config;

                clearTimeout(yamlErrorTimeout);
                this.yamlError = "";
            } catch (e) {
                clearTimeout(yamlErrorTimeout);

                if (this.yamlError) {
                    this.yamlError = e.message;

                } else {
                    yamlErrorTimeout = setTimeout(() => {
                        this.yamlError = e.message;
                    }, 3000);
                }
            }
        },

        enableEditMode() {
            this.isEditMode = true;
            this.showCompose = true;
        },

        checkYAML() {

        },

        addContainer() {
            this.checkYAML();

            if (this.jsonConfig.services[this.newContainerName]) {
                this.$root.toastError("Container name already exists");
                return;
            }

            if (!this.newContainerName) {
                this.$root.toastError("Container name cannot be empty");
                return;
            }

            this.jsonConfig.services[this.newContainerName] = {
                restart: "unless-stopped",
            };
            this.newContainerName = "";
            let element = this.$refs.containerList.lastElementChild;
            element.scrollIntoView({
                block: "start",
                behavior: "smooth"
            });
        },

        stackNameToLowercase() {
            this.stack.name = this.stack?.name?.toLowerCase();
        },

        async backupStack() {
            this.processing = true;

            try {
                const token = this.$root.storage().token;
                const headers = {};
                const env = process.env.NODE_ENV || "production";
                let baseURL = "";

                if (env === "development" || localStorage.dev === "dev") {
                    baseURL = `${location.protocol}//${location.hostname}:5001`;
                }

                if (token && token !== "autoLogin") {
                    headers.Authorization = `Bearer ${token}`;
                }

                const response = await fetch(`${baseURL}/api/stacks/${encodeURIComponent(this.stack.name)}/backup`, {
                    method: "GET",
                    headers,
                });

                if (!response.ok) {
                const contentType = response.headers.get("content-type") || "";
                if (contentType.includes("text/html")) {
                    throw new Error("Backup request returned an HTML page instead of archive. Please check backend API endpoint/proxy configuration.");
                }

                    let msg = "Failed to backup stack";
                    try {
                        const res = await response.json();
                        if (res && res.msg) {
                            msg = res.msg;
                        }
                    } catch (_error) {
                        // ignore json parsing errors
                    }
                    throw new Error(msg);
                }

                const blob = await response.blob();

                const url = window.URL.createObjectURL(blob);
                const contentDisposition = response.headers.get("content-disposition") || "";
                const matched = contentDisposition.match(/filename="([^"]+)"/i);
                const fileName = matched?.[1] || `${this.stack.name}-backup.tar.gz`;

                const link = document.createElement("a");
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                }, 1000);
            } catch (error) {
                if (error instanceof Error) {
                    this.$root.toastError(error.message);
                } else {
                    this.$root.toastError("Failed to backup stack");
                }
            } finally {
                this.processing = false;
            }
        },

    }
};
</script>

<style scoped lang="scss">
@import "../styles/vars.scss";

.terminal {
    height: 200px;
}

.editor-box {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
}

.agent-name {
    font-size: 13px;
    color: $dark-font-color3;
}

.action-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
}

.btn-group-responsive {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    .btn {
        border-radius: 50rem !important;
    }
}

@media (max-width: 767px) {
    .btn-group-responsive {
        width: 100%;

        .btn {
            flex: 1 1 auto;
            font-size: 13px;
            padding: 6px 12px;
        }
    }

    .action-bar {
        .btn {
            font-size: 13px;
        }
    }

    .editor-box {
        font-size: 12px;
    }
}
</style>
