import { suggestColor } from "../../domain/index.js";

export interface GroupingValues {
  readonly programId: string;
  readonly programName: string;
  readonly priorityFamilyId: string;
  readonly priorityFamilyName: string;
  readonly color: string;
  readonly colorChanged: boolean;
}

export interface GroupingCatalog {
  readonly programs?: readonly { readonly id: string; readonly name: string; readonly color?: string }[];
  readonly priorityFamilies?: readonly { readonly id: string; readonly name: string }[];
}

export function createGroupingControls(parent: HTMLElement, catalog: GroupingCatalog,
  initial: GroupingValues, entityId: string, onChange: () => void, fieldPrefix = "project") {
  const document = parent.ownerDocument;
  const programs = catalog.programs ?? [];
  const families = catalog.priorityFamilies ?? [];
  const container = document.createElement("div");
  container.className = "timeline-project-grouping-fields";
  const makeSelect = (label: string, items: readonly { id: string; name: string }[], value: string) => {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const select = document.createElement("select");
    select.name = `${fieldPrefix}.${label === "Program" ? "programId" : "priorityFamilyId"}`;
    select.dataset.fieldPath = select.name;
    for (const [id, name] of [["", "None"], ...items.map((item) => [item.id, item.name]), ["__new__", "New…"]]) {
      const option = document.createElement("option"); option.value = id!; option.textContent = name!; select.append(option);
    }
    if (value && !items.some((item) => item.id === value) && value !== "__new__") {
      const option = document.createElement("option"); option.value = value;
      option.textContent = `Unavailable ${label} (${label === "Program" ? initial.programName : initial.priorityFamilyName || value})`;
      select.append(option);
    }
    select.value = value;
    wrapper.append(select); container.append(wrapper);
    return select;
  };
  const program = makeSelect("Program", programs, initial.programId);
  const family = makeSelect("pas", families, initial.priorityFamilyId);
  const nameInput = (label: string, value: string) => {
    const wrapper = document.createElement("label"); wrapper.textContent = label;
    const field = document.createElement("input"); field.type = "text"; field.value = value;
    wrapper.append(field); container.append(wrapper); return { wrapper, field };
  };
  const newProgram = nameInput("New Program", initial.programId === "__new__" ? initial.programName : "");
  const newFamily = nameInput("New pas", initial.priorityFamilyId === "__new__" ? initial.priorityFamilyName : "");
  const colorWrapper = document.createElement("label"); colorWrapper.textContent = "Color";
  const color = document.createElement("input"); color.type = "color"; color.value = initial.color;
  colorWrapper.append(color); container.append(colorWrapper);
  parent.append(container);
  let colorChanged = initial.colorChanged;
  const sync = () => {
    newProgram.wrapper.hidden = program.value !== "__new__";
    newFamily.wrapper.hidden = family.value !== "__new__";
  };
  const read = (): GroupingValues => ({
    programId: program.value,
    programName: program.value === "__new__" ? newProgram.field.value
      : programs.find((item) => item.id === program.value)?.name
        ?? (program.value === initial.programId ? initial.programName : ""),
    priorityFamilyId: family.value,
    priorityFamilyName: family.value === "__new__" ? newFamily.field.value
      : families.find((item) => item.id === family.value)?.name
        ?? (family.value === initial.priorityFamilyId ? initial.priorityFamilyName : ""),
    color: color.value.toUpperCase(), colorChanged,
  });
  const notify = () => { sync(); onChange(); };
  program.addEventListener("change", () => {
    colorChanged = false;
    const selected = programs.find((item) => item.id === program.value);
    color.value = selected?.color ?? suggestColor(`${entityId}:${program.value === "__new__" ? "program:" + newProgram.field.value : "leave"}`,
      programs.map((item) => item.color).filter((value): value is string => !!value));
    notify();
  });
  newProgram.field.addEventListener("input", () => {
    if (!colorChanged) color.value = suggestColor(`${entityId}:program:${newProgram.field.value}`,
      programs.map((item) => item.color).filter((value): value is string => !!value));
    notify();
  });
  family.addEventListener("change", notify);
  newFamily.field.addEventListener("input", notify);
  color.addEventListener("input", () => {
    const selected = programs.find((item) => item.id === program.value);
    const baseline = selected?.color ?? (program.value === "__new__"
      ? suggestColor(`${entityId}:program:${newProgram.field.value}`,
        programs.map((item) => item.color).filter((value): value is string => !!value))
      : initial.programId === "" ? initial.color
        : suggestColor(`${entityId}:leave`, programs.map((item) => item.color).filter((value): value is string => !!value)));
    colorChanged = color.value.toUpperCase() !== baseline.toUpperCase();
    notify();
  });
  sync();
  return { read, program, family, color };
}
