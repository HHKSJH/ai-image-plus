<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  options: {
    type: Array,
    required: true
  },
  ariaLabel: {
    type: String,
    default: ""
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["update:modelValue"]);

const isOpen = ref(false);
const rootEl = ref(null);

const selectedOption = computed(() => props.options.find((item) => item.value === props.modelValue) || props.options[0]);

function toggleDropdown() {
  if (props.disabled) {
    return;
  }
  isOpen.value = !isOpen.value;
}

function selectOption(value) {
  emit("update:modelValue", value);
  isOpen.value = false;
}

function handleDocumentClick(event) {
  if (!rootEl.value?.contains(event.target)) {
    isOpen.value = false;
  }
}

function handleEscape(event) {
  if (event.key === "Escape") {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleEscape);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleEscape);
});
</script>

<template>
  <div ref="rootEl" class="dropdown" :class="{ 'is-open': isOpen }">
    <button
      class="dropdown-trigger"
      type="button"
      :aria-label="ariaLabel"
      aria-haspopup="listbox"
      :aria-expanded="String(isOpen)"
      :disabled="disabled"
      @click="toggleDropdown"
    >
      <span class="dropdown-copy">
        <span class="dropdown-value">{{ selectedOption.label }}</span>
        <span class="dropdown-meta">{{ selectedOption.meta }}</span>
      </span>
    </button>
    <div class="dropdown-menu" role="listbox" :aria-label="ariaLabel">
      <button
        v-for="option in options"
        :key="option.value"
        class="dropdown-option"
        :class="{ 'is-selected': option.value === modelValue }"
        type="button"
        @click="selectOption(option.value)"
      >
        <span class="dropdown-option-title">{{ option.label }}</span>
        <span class="dropdown-option-meta">{{ option.meta }}</span>
      </button>
    </div>
  </div>
</template>
