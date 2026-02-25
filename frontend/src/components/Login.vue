<template>
    <div class="form-container">
        <div class="form">
            <form @submit.prevent="submit">
                <div class="login-logo mb-4">
                    <object width="64" height="64" data="/icon.svg" />
                    <h1 class="h3 mt-2 fw-bold">Dockge</h1>
                    <p class="text-muted login-subtitle">{{ $t("Login") }}</p>
                </div>

                <div v-if="!tokenRequired" class="form-floating">
                    <input id="floatingInput" v-model="username" type="text" class="form-control" placeholder="Username" autocomplete="username" required>
                    <label for="floatingInput">{{ $t("Username") }}</label>
                </div>

                <div v-if="!tokenRequired" class="form-floating mt-3">
                    <input id="floatingPassword" v-model="password" type="password" class="form-control" placeholder="Password" autocomplete="current-password" required>
                    <label for="floatingPassword">{{ $t("Password") }}</label>
                </div>

                <div v-if="tokenRequired">
                    <div class="form-floating mt-3">
                        <input id="otp" v-model="token" type="text" maxlength="6" class="form-control" placeholder="123456" autocomplete="one-time-code" required>
                        <label for="otp">{{ $t("Token") }}</label>
                    </div>
                </div>

                <div class="form-check mb-3 mt-3 d-flex justify-content-center pe-4">
                    <div class="form-check">
                        <input id="remember" v-model="$root.remember" type="checkbox" value="remember-me" class="form-check-input">

                        <label class="form-check-label" for="remember">
                            {{ $t("Remember me") }}
                        </label>
                    </div>
                </div>
                <button class="w-100 btn btn-primary btn-login" type="submit" :disabled="processing">
                    <span v-if="processing" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    {{ $t("Login") }}
                </button>

                <div v-if="res && !res.ok" class="alert alert-danger mt-3" role="alert">
                    {{ $t(res.msg) }}
                </div>
            </form>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            processing: false,
            username: "",
            password: "",
            token: "",
            res: null,
            tokenRequired: false,
        };
    },

    mounted() {
        document.title += " - Login";
    },

    unmounted() {
        document.title = document.title.replace(" - Login", "");
    },

    methods: {
        /**
         * Submit the user details and attempt to log in
         * @returns {void}
         */
        submit() {
            this.processing = true;

            this.$root.login(this.username, this.password, this.token, (res) => {
                this.processing = false;

                if (res.tokenRequired) {
                    this.tokenRequired = true;
                } else {
                    this.res = res;
                }
            });
        },

    },
};
</script>

<style lang="scss" scoped>
@import "../styles/vars.scss";

.form-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80vh;
    padding-top: 40px;
    padding-bottom: 40px;
}

.form-floating {
    > label {
        padding-left: 1.3rem;
    }

    > .form-control {
        padding-left: 1.3rem;
        border-radius: 12px;
        height: 3.2rem;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;

        &:focus {
            border-color: $primary;
            box-shadow: 0 0 0 3px rgba($primary, 0.15);
        }
    }
}

.form {
    width: 100%;
    max-width: 380px;
    padding: 30px;
    margin: auto;
    text-align: center;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 20px;
    backdrop-filter: blur(10px);

    .dark & {
        background: rgba(22, 27, 34, 0.6);
        border: 1px solid $dark-border-color;
    }
}

.login-logo {
    object {
        filter: drop-shadow(0 4px 12px rgba($primary, 0.3));
    }

    h1 {
        background: $primary-gradient;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }
}

.login-subtitle {
    font-size: 14px;
    margin-bottom: 0;
}

.btn-login {
    border-radius: 12px;
    padding: 10px 20px;
    font-weight: 600;
    font-size: 15px;
    transition: transform 0.15s ease, box-shadow 0.15s ease;

    &:active {
        transform: scale(0.98);
    }
}
</style>
