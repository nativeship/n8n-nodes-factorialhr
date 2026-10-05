"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Factorial = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const http_1 = require("../../shared/http");
function normalizeParameterValue(value) {
    if (value && typeof value === 'object' && 'value' in value)
        return value.value;
    return value;
}
function normalizeJsonValue(value, label, context, itemIndex) {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed)
            return {};
        try {
            return JSON.parse(trimmed);
        }
        catch (error) {
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${label} must be valid JSON: ${error.message}`, { itemIndex });
        }
    }
    if (value === null || Array.isArray(value) || (value && typeof value === 'object') || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        return value;
    throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${label} must be valid JSON`, { itemIndex });
}
function validateBodyValue(value, contract, path, context, itemIndex) {
    var _a, _b, _c, _d, _e;
    if (value === undefined || value === '') {
        if (contract.required)
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} is required`, { itemIndex });
        return;
    }
    if (value === null) {
        if (contract.nullable)
            return;
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must not be null`, { itemIndex });
    }
    if ((_a = contract.alternatives) === null || _a === void 0 ? void 0 : _a.length) {
        selectAlternativeValue(value, contract, path, context, itemIndex);
        return;
    }
    if (contract.type === 'string' && typeof value !== 'string')
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a string`, { itemIndex });
    if (contract.type === 'boolean' && typeof value !== 'boolean')
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a boolean`, { itemIndex });
    if (contract.type === 'number' && typeof value !== 'number')
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a number`, { itemIndex });
    if (contract.type === 'integer' && (typeof value !== 'number' || !Number.isInteger(value)))
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be an integer`, { itemIndex });
    if ((_b = contract.enum) === null || _b === void 0 ? void 0 : _b.length) {
        const enumValueMatches = (candidate) => candidate === value ||
            (candidate === null && value === 'null') ||
            (candidate === 'null' && value === null) ||
            Boolean(candidate && value && typeof candidate === 'object' && typeof value === 'object' && JSON.stringify(candidate) === JSON.stringify(value));
        const scalarEnum = contract.enum.every((candidate) => candidate === null || ['string', 'number', 'boolean'].includes(typeof candidate));
        const matches = contract.type === 'array' && Array.isArray(value) && scalarEnum
            ? value.every((item) => contract.enum.some((candidate) => candidate === item || (candidate === null && item === 'null') || (candidate === 'null' && item === null)))
            : contract.enum.some(enumValueMatches);
        if (!matches)
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be one of: ${contract.enum.join(', ')}`, { itemIndex });
    }
    if (contract.type === 'number' || contract.type === 'integer') {
        const numeric = value;
        if (contract.minValue !== undefined && numeric < contract.minValue)
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be at least ${contract.minValue}`, { itemIndex });
        if (contract.maxValue !== undefined && numeric > contract.maxValue)
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be at most ${contract.maxValue}`, { itemIndex });
    }
    if (contract.pattern && typeof value === 'string' && !new RegExp(contract.pattern).test(value))
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must match ${contract.pattern}`, { itemIndex });
    if (contract.format === 'email' && typeof value === 'string' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(value))
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be an email address`, { itemIndex });
    if ((contract.format === 'uri' || contract.format === 'url') && typeof value === 'string') {
        try {
            new URL(value);
        }
        catch {
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a URL`, { itemIndex });
        }
    }
    if (contract.format === 'uuid' && typeof value === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value))
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a UUID`, { itemIndex });
    if (contract.type === 'object') {
        if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a JSON object`, { itemIndex });
        const objectValue = value;
        for (const child of (_c = contract.fields) !== null && _c !== void 0 ? _c : [])
            validateBodyValue(objectValue[child.name], child, `${path}.${child.name}`, context, itemIndex);
        if (contract.additionalValue) {
            const known = new Set(((_d = contract.fields) !== null && _d !== void 0 ? _d : []).map((field) => field.name));
            for (const [key, childValue] of Object.entries(objectValue)) {
                if (!known.has(key)) {
                    if (((_e = contract.additionalValue.alternatives) === null || _e === void 0 ? void 0 : _e.length) && contract.additionalValue.representation === 'raw')
                        continue;
                    validateBodyValue(childValue, contract.additionalValue, `${path}.${key}`, context, itemIndex);
                }
            }
        }
    }
    if (contract.type === 'array') {
        if (!Array.isArray(value))
            throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must be a JSON array`, { itemIndex });
        if (contract.items)
            value.forEach((item, index) => validateBodyValue(item, contract.items, `${path}[${index}]`, context, itemIndex));
    }
}
function setBodyField(body, contract, value, context, itemIndex) {
    var _a, _b;
    const normalized = contract.type === 'object' || contract.type === 'array' || contract.type === 'alternative' || contract.representation === 'raw'
        ? normalizeJsonValue(value, (_a = contract.displayName) !== null && _a !== void 0 ? _a : contract.name, context, itemIndex)
        : normalizeParameterValue(value);
    const selected = ((_b = contract.alternatives) === null || _b === void 0 ? void 0 : _b.length) ? selectAlternativeValue(normalized, contract, contract.name, context, itemIndex) : normalized;
    validateBodyValue(selected, { ...contract, alternatives: undefined, composition: undefined }, contract.name, context, itemIndex);
    body[contract.name] = selected;
}
function selectAlternativeValue(value, contract, path, context, itemIndex) {
    var _a, _b, _c;
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} must include an explicit schema alternative and value`, { itemIndex });
    const selectedName = String((_a = value.schemaAlternative) !== null && _a !== void 0 ? _a : '');
    const selected = ((_b = contract.alternatives) !== null && _b !== void 0 ? _b : []).find((alternative) => alternative.name === selectedName);
    if (!selected)
        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `${path} schema alternative must be one of: ${((_c = contract.alternatives) !== null && _c !== void 0 ? _c : []).map((alternative) => alternative.name).join(', ')}`, { itemIndex });
    const selectedValue = value.value;
    validateBodyValue(selectedValue, selected, path, context, itemIndex);
    return selectedValue;
}
function selectResponseFields(value, fields) {
    if (fields.length === 0)
        return value;
    const selected = {};
    if (value.id !== undefined)
        selected.id = value.id;
    for (const field of fields)
        if (value[field] !== undefined)
            selected[field] = value[field];
    return selected;
}
function valueAtPath(value, path) {
    if (!path)
        return value;
    return path.split('.').filter(Boolean).reduce((current, segment) => {
        if (current === undefined || current === null)
            return undefined;
        if (Array.isArray(current))
            return current[Number(segment)];
        return current[segment];
    }, value);
}
class Factorial {
    constructor() {
        this.description = {
            displayName: "Factorial",
            name: "factorial",
            icon: {
                light: "file:factorial.svg",
                dark: "file:factorial.dark.svg"
            },
            group: [],
            version: [
                1
            ],
            subtitle: "={{((JSON.parse(\"\\u007b\\\"ats\\\":\\u007b\\\"applyApplication\\\":\\\"applyForAPosition: ats\\\",\\\"createApplication\\\":\\\"createApplication: ats\\\",\\\"createJobPosting\\\":\\\"createJobPosting: ats\\\",\\\"duplicateJobPosting\\\":\\\"duplicateJobPosting: ats\\\",\\\"listApplications\\\":\\\"listApplications: ats\\\",\\\"listCandidates\\\":\\\"listCandidates: ats\\\",\\\"listJobPostings\\\":\\\"listJobPostings: ats\\\"\\u007d,\\\"attendance\\\":\\u007b\\\"clockIn\\\":\\\"clockIn: attendance\\\",\\\"clockOut\\\":\\\"clockOut: attendance\\\",\\\"createShift\\\":\\\"createShift: attendance\\\",\\\"listShifts\\\":\\\"listShifts: attendance\\\"\\u007d,\\\"employees\\\":\\u007b\\\"createEmployee\\\":\\\"createEmployee: employee\\\",\\\"deleteEmployee\\\":\\\"deleteEmployee: employee\\\",\\\"getEmployee\\\":\\\"getEmployee: employee\\\",\\\"listEmployees\\\":\\\"listEmployees: employee\\\",\\\"updateEmployee\\\":\\\"updateEmployee: employee\\\"\\u007d,\\\"finance\\\":\\u007b\\\"createAccount\\\":\\\"createFinanceAccount: finance\\\",\\\"listAccounts\\\":\\\"listFinanceAccounts: finance\\\"\\u007d,\\\"tasks\\\":\\u007b\\\"createTask\\\":\\\"createTask: task\\\",\\\"listTasks\\\":\\\"listTasks: task\\\"\\u007d,\\\"timeOff\\\":\\u007b\\\"createLeave\\\":\\\"createLeaveRequest: timeOff\\\",\\\"listLeaves\\\":\\\"listLeaves: timeOff\\\"\\u007d\\u007d\"))[$parameter[\"resource\"]] || {})[$parameter[\"operation\"]] || ($parameter[\"operation\"] + \": \" + $parameter[\"resource\"])}}",
            description: "Factorial brings HR, payroll, time tracking, talent, and finance processes into one platform.",
            documentationUrl: "https://api.factorialhr.com/api/2026-01-01/resources",
            defaults: {
                name: "Factorial"
            },
            usableAsTool: true,
            inputs: [
                n8n_workflow_1.NodeConnectionTypes.Main
            ],
            outputs: [
                n8n_workflow_1.NodeConnectionTypes.Main
            ],
            credentials: [
                {
                    name: "factorialOAuth2Api",
                    required: true
                }
            ],
            properties: [
                {
                    displayName: "Resource",
                    name: "resource",
                    type: "options",
                    noDataExpression: true,
                    default: "ats",
                    options: [
                        {
                            name: "ATS Resource",
                            value: "ats"
                        },
                        {
                            name: "Attendance",
                            value: "attendance"
                        },
                        {
                            name: "Employee",
                            value: "employees"
                        },
                        {
                            name: "Finance",
                            value: "finance"
                        },
                        {
                            name: "Task",
                            value: "tasks"
                        },
                        {
                            name: "Time Off",
                            value: "timeOff"
                        }
                    ]
                },
                {
                    displayName: "Operation",
                    name: "operation",
                    type: "options",
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: [
                                "ats"
                            ]
                        }
                    },
                    default: "applyApplication",
                    options: [
                        {
                            name: "Apply For A Position",
                            value: "applyApplication",
                            action: "Apply for a position ats",
                            description: "Submit an application for a position through factorial ats"
                        },
                        {
                            name: "Create Application",
                            value: "createApplication",
                            action: "Create application",
                            description: "Create an ats application for a candidate and job posting"
                        },
                        {
                            name: "Create Job Posting",
                            value: "createJobPosting",
                            action: "Create job posting",
                            description: "Create a job posting in factorial ats"
                        },
                        {
                            name: "Duplicate Job Posting",
                            value: "duplicateJobPosting",
                            action: "Duplicate job posting",
                            description: "Create a copy of an existing job posting"
                        },
                        {
                            name: "List Applications",
                            value: "listApplications",
                            action: "List applications",
                            description: "List job applications with their candidate and job-posting details"
                        },
                        {
                            name: "List Candidates",
                            value: "listCandidates",
                            action: "List candidates",
                            description: "List candidate records available to your account. visibility depends on API credential permissions and hiring-manager access."
                        },
                        {
                            name: "List Job Postings",
                            value: "listJobPostings",
                            action: "List job postings ats",
                            description: "List job postings in factorial ats"
                        }
                    ]
                },
                {
                    displayName: "Body JSON",
                    name: "bodyJson",
                    type: "json",
                    default: {},
                    required: true,
                    description: "Raw request body",
                    displayOptions: {
                        show: {
                            resource: [
                                "ats"
                            ],
                            operation: [
                                "applyApplication"
                            ]
                        }
                    }
                },
                {
                    displayName: "Body JSON",
                    name: "bodyJson",
                    type: "json",
                    default: {},
                    required: true,
                    description: "Raw request body",
                    displayOptions: {
                        show: {
                            resource: [
                                "ats"
                            ],
                            operation: [
                                "createApplication"
                            ]
                        }
                    }
                },
                {
                    displayName: "Body JSON",
                    name: "bodyJson",
                    type: "json",
                    default: {},
                    required: true,
                    description: "Raw request body",
                    displayOptions: {
                        show: {
                            resource: [
                                "ats"
                            ],
                            operation: [
                                "createJobPosting"
                            ]
                        }
                    }
                },
                {
                    displayName: "Additional Fields",
                    name: "additionalFields",
                    type: "collection",
                    placeholder: "Add Field",
                    default: {},
                    displayOptions: {
                        show: {
                            resource: [
                                "ats"
                            ],
                            operation: [
                                "duplicateJobPosting"
                            ]
                        }
                    },
                    options: [
                        {
                            displayName: "Job Posting ID",
                            name: "job_posting_id",
                            type: "string",
                            default: "",
                            description: "ID of the job posting to copy"
                        }
                    ]
                },
                {
                    displayName: "Operation",
                    name: "operation",
                    type: "options",
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: [
                                "attendance"
                            ]
                        }
                    },
                    default: "clockIn",
                    options: [
                        {
                            name: "Clock In",
                            value: "clockIn",
                            action: "Clock in attendance",
                            description: "Record the start of a shift for an employee. the shift stays open until clocked out. attendance."
                        },
                        {
                            name: "Clock Out",
                            value: "clockOut",
                            action: "Clock out attendance",
                            description: "Complete an open shift by recording its clock-out time. the shift must have been started with the clock-in endpoint. attendance."
                        },
                        {
                            name: "Create Shift",
                            value: "createShift",
                            action: "Create shift attendance",
                            description: "Create a shift using an employee ID and start and end times. attendance."
                        },
                        {
                            name: "List Shifts",
                            value: "listShifts",
                            action: "List shifts attendance",
                            description: "List employee shift records in factorial. attendance."
                        }
                    ]
                },
                {
                    displayName: "Additional Fields",
                    name: "additionalFields",
                    type: "collection",
                    placeholder: "Add Field",
                    default: {},
                    displayOptions: {
                        show: {
                            resource: [
                                "attendance"
                            ],
                            operation: [
                                "clockIn"
                            ]
                        }
                    },
                    options: [
                        {
                            displayName: "Employee ID",
                            name: "employee_id",
                            type: "string",
                            default: "",
                            description: "ID of the employee clocking in"
                        },
                        {
                            displayName: "Now",
                            name: "now",
                            type: "dateTime",
                            default: "",
                            description: "Timestamp to record as the shift start, in ISO 8601 format with a timezone offset"
                        }
                    ]
                },
                {
                    displayName: "Additional Fields",
                    name: "additionalFields",
                    type: "collection",
                    placeholder: "Add Field",
                    default: {},
                    displayOptions: {
                        show: {
                            resource: [
                                "attendance"
                            ],
                            operation: [
                                "clockOut"
                            ]
                        }
                    },
                    options: [
                        {
                            displayName: "Employee ID",
                            name: "employee_id",
                            type: "string",
                            default: "",
                            description: "ID of the employee clocking out"
                        },
                        {
                            displayName: "Now",
                            name: "now",
                            type: "dateTime",
                            default: "",
                            description: "Timestamp to record as the shift end, in ISO 8601 format with a timezone offset"
                        }
                    ]
                },
                {
                    displayName: "Additional Fields",
                    name: "additionalFields",
                    type: "collection",
                    placeholder: "Add Field",
                    default: {},
                    displayOptions: {
                        show: {
                            resource: [
                                "attendance"
                            ],
                            operation: [
                                "createShift"
                            ]
                        }
                    },
                    options: [
                        {
                            displayName: "Employee ID",
                            name: "employee_id",
                            type: "string",
                            default: "",
                            description: "ID of the employee assigned to the shift"
                        },
                        {
                            displayName: "End Time",
                            name: "end_time",
                            type: "dateTime",
                            default: "",
                            description: "Shift end timestamp in ISO 8601 format, including a timezone offset"
                        },
                        {
                            displayName: "Start Time",
                            name: "start_time",
                            type: "dateTime",
                            default: "",
                            description: "Shift start timestamp in ISO 8601 format, including a timezone offset"
                        }
                    ]
                },
                {
                    displayName: "Operation",
                    name: "operation",
                    type: "options",
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: [
                                "employees"
                            ]
                        }
                    },
                    default: "createEmployee",
                    options: [
                        {
                            name: "Create",
                            value: "createEmployee",
                            action: "Create employee",
                            description: "Create an employee record with the supplied name, email, and hire date"
                        },
                        {
                            name: "Delete",
                            value: "deleteEmployee",
                            action: "Delete employee",
                            description: "Delete the employee record identified by its ID"
                        },
                        {
                            name: "Get",
                            value: "getEmployee",
                            action: "Get employee",
                            description: "Retrieve the employee record identified by its ID"
                        },
                        {
                            name: "List",
                            value: "listEmployees",
                            action: "List employees",
                            description: "List employee records visible to the authenticated user. returned details depend on permissions assigned to the API user."
                        },
                        {
                            name: "Update",
                            value: "updateEmployee",
                            action: "Update employee",
                            description: "Update an employee record by ID using the supplied employee details"
                        }
                    ]
                },
                {
                    displayName: "Additional Fields",
                    name: "additionalFields",
                    type: "collection",
                    placeholder: "Add Field",
                    default: {},
                    displayOptions: {
                        show: {
                            resource: [
                                "employees"
                            ],
                            operation: [
                                "createEmployee"
                            ]
                        }
                    },
                    options: [
                        {
                            displayName: "Email",
                            name: "email",
                            type: "string",
                            default: "",
                            description: "Email address associated with the employee",
                            placeholder: "name@email.com"
                        },
                        {
                            displayName: "First Name",
                            name: "first_name",
                            type: "string",
                            default: "",
                            description: "Employee first name"
                        },
                        {
                            displayName: "Hire Date",
                            name: "hire_date",
                            type: "string",
                            default: "",
                            description: "Employee hire date in yyyy-mm-dd format"
                        },
                        {
                            displayName: "Last Name",
                            name: "last_name",
                            type: "string",
                            default: "",
                            description: "Employee last name"
                        }
                    ]
                },
                {
                    displayName: "ID",
                    name: "id",
                    type: "string",
                    default: "",
                    required: true,
                    displayOptions: {
                        show: {
                            resource: [
                                "employees"
                            ],
                            operation: [
                                "deleteEmployee"
                            ]
                        }
                    }
                },
                {
                    displayName: "ID",
                    name: "id",
                    type: "string",
                    default: "",
                    required: true,
                    displayOptions: {
                        show: {
                            resource: [
                                "employees"
                            ],
                            operation: [
                                "getEmployee"
                            ]
                        }
                    }
                },
                {
                    displayName: "ID",
                    name: "id",
                    type: "string",
                    default: "",
                    required: true,
                    displayOptions: {
                        show: {
                            resource: [
                                "employees"
                            ],
                            operation: [
                                "updateEmployee"
                            ]
                        }
                    }
                },
                {
                    displayName: "Additional Fields",
                    name: "additionalFields",
                    type: "collection",
                    placeholder: "Add Field",
                    default: {},
                    displayOptions: {
                        show: {
                            resource: [
                                "employees"
                            ],
                            operation: [
                                "updateEmployee"
                            ]
                        }
                    },
                    options: [
                        {
                            displayName: "Email",
                            name: "email",
                            type: "string",
                            default: "",
                            description: "Email address associated with the employee",
                            placeholder: "name@email.com"
                        },
                        {
                            displayName: "First Name",
                            name: "first_name",
                            type: "string",
                            default: "",
                            description: "Employee first name"
                        },
                        {
                            displayName: "Hire Date",
                            name: "hire_date",
                            type: "string",
                            default: "",
                            description: "Employee hire date in yyyy-mm-dd format"
                        },
                        {
                            displayName: "Last Name",
                            name: "last_name",
                            type: "string",
                            default: "",
                            description: "Employee last name"
                        }
                    ]
                },
                {
                    displayName: "Operation",
                    name: "operation",
                    type: "options",
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: [
                                "finance"
                            ]
                        }
                    },
                    default: "createAccount",
                    options: [
                        {
                            name: "Create Finance Account",
                            value: "createAccount",
                            action: "Create finance account",
                            description: "Create a finance account in factorial"
                        },
                        {
                            name: "List Finance Accounts",
                            value: "listAccounts",
                            action: "List finance accounts",
                            description: "List finance accounts in factorial"
                        }
                    ]
                },
                {
                    displayName: "Body JSON",
                    name: "bodyJson",
                    type: "json",
                    default: {},
                    required: true,
                    description: "Raw request body",
                    displayOptions: {
                        show: {
                            resource: [
                                "finance"
                            ],
                            operation: [
                                "createAccount"
                            ]
                        }
                    }
                },
                {
                    displayName: "Operation",
                    name: "operation",
                    type: "options",
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: [
                                "tasks"
                            ]
                        }
                    },
                    default: "createTask",
                    options: [
                        {
                            name: "Create",
                            value: "createTask",
                            action: "Create task",
                            description: "Create a task in factorial"
                        },
                        {
                            name: "List",
                            value: "listTasks",
                            action: "List tasks",
                            description: "List task records in factorial"
                        }
                    ]
                },
                {
                    displayName: "Body JSON",
                    name: "bodyJson",
                    type: "json",
                    default: {},
                    required: true,
                    description: "Raw request body",
                    displayOptions: {
                        show: {
                            resource: [
                                "tasks"
                            ],
                            operation: [
                                "createTask"
                            ]
                        }
                    }
                },
                {
                    displayName: "Operation",
                    name: "operation",
                    type: "options",
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: [
                                "timeOff"
                            ]
                        }
                    },
                    default: "createLeave",
                    options: [
                        {
                            name: "Create Leave Request",
                            value: "createLeave",
                            action: "Create leave request time off",
                            description: "Create a leave request with an employee ID, date range, and leave type. time off."
                        },
                        {
                            name: "List Leaves",
                            value: "listLeaves",
                            action: "List leaves time off",
                            description: "Retrieve employee leave requests from factorial. time off."
                        }
                    ]
                },
                {
                    displayName: "Additional Fields",
                    name: "additionalFields",
                    type: "collection",
                    placeholder: "Add Field",
                    default: {},
                    displayOptions: {
                        show: {
                            resource: [
                                "timeOff"
                            ],
                            operation: [
                                "createLeave"
                            ]
                        }
                    },
                    options: [
                        {
                            displayName: "Employee ID",
                            name: "employee_id",
                            type: "string",
                            default: "",
                            description: "ID of the employee requesting leave"
                        },
                        {
                            displayName: "End Date",
                            name: "end_date",
                            type: "string",
                            default: "",
                            description: "Last date of the leave in yyyy-mm-dd format"
                        },
                        {
                            displayName: "Leave Type ID",
                            name: "leave_type_id",
                            type: "string",
                            default: "",
                            description: "ID of the leave type for this request"
                        },
                        {
                            displayName: "Start Date",
                            name: "start_date",
                            type: "string",
                            default: "",
                            description: "First date of the leave in yyyy-mm-dd format"
                        }
                    ]
                }
            ]
        };
    }
    async execute() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const inputItems = this.getInputData();
        const output = [];
        for (let itemIndex = 0; itemIndex < inputItems.length; itemIndex += 1) {
            const outputStart = output.length;
            let errorPlan = {};
            try {
                const operation = this.getNodeParameter('operation', itemIndex);
                const nodeVersion = this.getNode().typeVersion;
                let additionalFields = {};
                const nodeOptions = this.getNodeParameter('options', itemIndex, {});
                let retryContract = { mode: 'none', maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0 };
                let credentialApplications;
                let options;
                let pagination = { style: 'none', advancement: '', maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10 * 1024 * 1024, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                let responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                switch (operation) {
                    case "applyApplication": {
                        const path = "/ats/applications/apply";
                        const qs = {};
                        const headers = {};
                        let body = {};
                        body = normalizeJsonValue(this.getNodeParameter("bodyJson", itemIndex), "Body JSON", this, itemIndex);
                        validateBodyValue(body, { "name": "bodyJson", "displayName": "Body JSON", "type": "any", "required": true, "description": "Raw request body", "representation": "raw" }, "Body JSON", this, itemIndex);
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "createApplication": {
                        const path = "/ats/applications";
                        const qs = {};
                        const headers = {};
                        let body = {};
                        body = normalizeJsonValue(this.getNodeParameter("bodyJson", itemIndex), "Body JSON", this, itemIndex);
                        validateBodyValue(body, { "name": "bodyJson", "displayName": "Body JSON", "type": "any", "required": true, "description": "Raw request body", "representation": "raw" }, "Body JSON", this, itemIndex);
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "createJobPosting": {
                        const path = "/ats/job-postings";
                        const qs = {};
                        const headers = {};
                        let body = {};
                        body = normalizeJsonValue(this.getNodeParameter("bodyJson", itemIndex), "Body JSON", this, itemIndex);
                        validateBodyValue(body, { "name": "bodyJson", "displayName": "Body JSON", "type": "any", "required": true, "description": "Raw request body", "representation": "raw" }, "Body JSON", this, itemIndex);
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "duplicateJobPosting": {
                        additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                        const path = "/ats/job-postings/duplicate";
                        const qs = {};
                        const headers = {};
                        const body = {};
                        if (additionalFields["job_posting_id"] !== undefined)
                            setBodyField(body, { "name": "job_posting_id", "displayName": "Job posting id", "description": "ID of the job posting to copy.", "type": "string" }, additionalFields["job_posting_id"], this, itemIndex);
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "listApplications": {
                        const path = "/ats/applications";
                        const qs = {};
                        const body = {};
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "listCandidates": {
                        const path = "/ats/candidates";
                        const qs = {};
                        const body = {};
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "listJobPostings": {
                        const path = "/ats/job-postings";
                        const qs = {};
                        const body = {};
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "clockIn": {
                        additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                        const path = "/attendance/shifts/clock-in";
                        const qs = {};
                        const headers = {};
                        const body = {};
                        if (additionalFields["employee_id"] !== undefined)
                            setBodyField(body, { "name": "employee_id", "displayName": "Employee id", "description": "ID of the employee clocking in.", "type": "string" }, additionalFields["employee_id"], this, itemIndex);
                        if (additionalFields["now"] !== undefined)
                            setBodyField(body, { "name": "now", "displayName": "Now", "description": "Timestamp to record as the shift start, in ISO 8601 format with a timezone offset.", "type": "string", "format": "date-time" }, additionalFields["now"], this, itemIndex);
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "clockOut": {
                        additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                        const path = "/attendance/shifts/clock-out";
                        const qs = {};
                        const headers = {};
                        const body = {};
                        if (additionalFields["employee_id"] !== undefined)
                            setBodyField(body, { "name": "employee_id", "displayName": "Employee id", "description": "ID of the employee clocking out.", "type": "string" }, additionalFields["employee_id"], this, itemIndex);
                        if (additionalFields["now"] !== undefined)
                            setBodyField(body, { "name": "now", "displayName": "Now", "description": "Timestamp to record as the shift end, in ISO 8601 format with a timezone offset.", "type": "string", "format": "date-time" }, additionalFields["now"], this, itemIndex);
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "createShift": {
                        additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                        const path = "/attendance/shifts";
                        const qs = {};
                        const headers = {};
                        const body = {};
                        if (additionalFields["employee_id"] !== undefined)
                            setBodyField(body, { "name": "employee_id", "displayName": "Employee id", "description": "ID of the employee assigned to the shift.", "type": "string" }, additionalFields["employee_id"], this, itemIndex);
                        if (additionalFields["end_time"] !== undefined)
                            setBodyField(body, { "name": "end_time", "displayName": "End time", "description": "Shift end timestamp in ISO 8601 format, including a timezone offset.", "type": "string", "format": "date-time" }, additionalFields["end_time"], this, itemIndex);
                        if (additionalFields["start_time"] !== undefined)
                            setBodyField(body, { "name": "start_time", "displayName": "Start time", "description": "Shift start timestamp in ISO 8601 format, including a timezone offset.", "type": "string", "format": "date-time" }, additionalFields["start_time"], this, itemIndex);
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "listShifts": {
                        const path = "/attendance/shifts";
                        const qs = {};
                        const body = {};
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "createEmployee": {
                        additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                        const path = "/employees/employees";
                        const qs = {};
                        const headers = {};
                        const body = {};
                        if (additionalFields["email"] !== undefined)
                            setBodyField(body, { "name": "email", "displayName": "Email", "description": "Email address associated with the employee.", "type": "string" }, additionalFields["email"], this, itemIndex);
                        if (additionalFields["first_name"] !== undefined)
                            setBodyField(body, { "name": "first_name", "displayName": "First name", "description": "Employee first name.", "type": "string" }, additionalFields["first_name"], this, itemIndex);
                        if (additionalFields["hire_date"] !== undefined)
                            setBodyField(body, { "name": "hire_date", "displayName": "Hire date", "description": "Employee hire date in YYYY-MM-DD format.", "type": "string", "format": "date" }, additionalFields["hire_date"], this, itemIndex);
                        if (additionalFields["last_name"] !== undefined)
                            setBodyField(body, { "name": "last_name", "displayName": "Last name", "description": "Employee last name.", "type": "string" }, additionalFields["last_name"], this, itemIndex);
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["email", "first_name", "hire_date", "id", "last_name", "status"], simplified: ["email", "first_name", "hire_date", "id", "last_name", "status"] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "deleteEmployee": {
                        let path = "/employees/employees/{id}";
                        const qs = {};
                        const body = {};
                        path = path.split("{id}").join(encodeURIComponent(String(this.getNodeParameter("id", itemIndex))));
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "DELETE", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "getEmployee": {
                        let path = "/employees/employees/{id}";
                        const qs = {};
                        const body = {};
                        path = path.split("{id}").join(encodeURIComponent(String(this.getNodeParameter("id", itemIndex))));
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["email", "first_name", "hire_date", "id", "last_name", "status"], simplified: ["email", "first_name", "hire_date", "id", "last_name", "status"] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "listEmployees": {
                        const path = "/employees/employees";
                        const qs = {};
                        const body = {};
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: ["email", "first_name", "hire_date", "id", "last_name", "status"], simplified: ["email", "first_name", "hire_date", "id", "last_name", "status"] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "updateEmployee": {
                        additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                        let path = "/employees/employees/{id}";
                        const qs = {};
                        const headers = {};
                        const body = {};
                        path = path.split("{id}").join(encodeURIComponent(String(this.getNodeParameter("id", itemIndex))));
                        if (additionalFields["email"] !== undefined)
                            setBodyField(body, { "name": "email", "displayName": "Email", "description": "Email address associated with the employee.", "type": "string" }, additionalFields["email"], this, itemIndex);
                        if (additionalFields["first_name"] !== undefined)
                            setBodyField(body, { "name": "first_name", "displayName": "First name", "description": "Employee first name.", "type": "string" }, additionalFields["first_name"], this, itemIndex);
                        if (additionalFields["hire_date"] !== undefined)
                            setBodyField(body, { "name": "hire_date", "displayName": "Hire date", "description": "Employee hire date in YYYY-MM-DD format.", "type": "string", "format": "date" }, additionalFields["hire_date"], this, itemIndex);
                        if (additionalFields["last_name"] !== undefined)
                            setBodyField(body, { "name": "last_name", "displayName": "Last name", "description": "Employee last name.", "type": "string" }, additionalFields["last_name"], this, itemIndex);
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "PUT", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "createAccount": {
                        const path = "/finance/accounts";
                        const qs = {};
                        const headers = {};
                        let body = {};
                        body = normalizeJsonValue(this.getNodeParameter("bodyJson", itemIndex), "Body JSON", this, itemIndex);
                        validateBodyValue(body, { "name": "bodyJson", "displayName": "Body JSON", "type": "any", "required": true, "description": "Raw request body", "representation": "raw" }, "Body JSON", this, itemIndex);
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "listAccounts": {
                        const path = "/finance/accounts";
                        const qs = {};
                        const body = {};
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "listCredentials": {
                        const path = "/api_public/credentials";
                        const qs = {};
                        const body = {};
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "createTask": {
                        const path = "/tasks/tasks";
                        const qs = {};
                        const headers = {};
                        let body = {};
                        body = normalizeJsonValue(this.getNodeParameter("bodyJson", itemIndex), "Body JSON", this, itemIndex);
                        validateBodyValue(body, { "name": "bodyJson", "displayName": "Body JSON", "type": "any", "required": true, "description": "Raw request body", "representation": "raw" }, "Body JSON", this, itemIndex);
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "listTasks": {
                        const path = "/tasks/tasks";
                        const qs = {};
                        const body = {};
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "createLeave": {
                        additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                        const path = "/timeoff/leaves";
                        const qs = {};
                        const headers = {};
                        const body = {};
                        if (additionalFields["employee_id"] !== undefined)
                            setBodyField(body, { "name": "employee_id", "displayName": "Employee id", "description": "ID of the employee requesting leave.", "type": "string" }, additionalFields["employee_id"], this, itemIndex);
                        if (additionalFields["end_date"] !== undefined)
                            setBodyField(body, { "name": "end_date", "displayName": "End date", "description": "Last date of the leave in YYYY-MM-DD format.", "type": "string", "format": "date" }, additionalFields["end_date"], this, itemIndex);
                        if (additionalFields["leave_type_id"] !== undefined)
                            setBodyField(body, { "name": "leave_type_id", "displayName": "Leave type id", "description": "ID of the leave type for this request.", "type": "string" }, additionalFields["leave_type_id"], this, itemIndex);
                        if (additionalFields["start_date"] !== undefined)
                            setBodyField(body, { "name": "start_date", "displayName": "Start date", "description": "First date of the leave in YYYY-MM-DD format.", "type": "string", "format": "date" }, additionalFields["start_date"], this, itemIndex);
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "listLeaves": {
                        const path = "/timeoff/leaves";
                        const qs = {};
                        const body = {};
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "createWebhookSubscription": {
                        additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                        const path = "/api_public/webhook-subscriptions";
                        const qs = {};
                        const headers = {};
                        const body = {};
                        if (additionalFields["events"] !== undefined)
                            setBodyField(body, { "name": "events", "displayName": "Events", "description": "Event types to subscribe to.", "type": "array", "representation": "raw", "items": { "name": "item", "displayName": "Item", "type": "string" } }, additionalFields["events"], this, itemIndex);
                        if (additionalFields["url"] !== undefined)
                            setBodyField(body, { "name": "url", "displayName": "Url", "description": "URL Factorial sends webhook event notifications to.", "type": "string" }, additionalFields["url"], this, itemIndex);
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "POST", url: serverBaseUrl.url + path, qs, headers: { ...headers, ...{ 'Content-Type': "application/json" } }, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    case "listWebhookSubscriptions": {
                        const path = "/api_public/webhook-subscriptions";
                        const qs = {};
                        const body = {};
                        const serverBaseUrl = { url: "https://api.factorialhr.com/api/2026-01-01/resources", blockRedirects: false };
                        options = { method: "GET", url: serverBaseUrl.url + path, qs, body: body, json: true, arrayFormat: "indices", ...(serverBaseUrl.blockRedirects ? { maxRedirects: 0 } : {}) };
                        credentialApplications = ([{ "credentialType": "factorialOAuth2Api", "type": "oauth2" }]);
                        retryContract = { mode: "none", retryConnectionFailures: false, retryTimeouts: false, retryRateLimits: false, retryServerErrors: false, maxAttempts: 1, maxElapsedMs: 30000, baseBackoffMs: 500, maxBackoffMs: 5000, jitterRatio: 0.2, idempotency: undefined };
                        pagination = { style: "none", page: "", limit: "", cursor: "", responseCursor: "", hasMore: "", itemPath: "", advancement: "", maxPages: 1, maxItems: Number.POSITIVE_INFINITY, maxElapsedMs: 30000, maxMemoryBytes: 10485760, repeatedCursorLimit: 1, repeatedPageLimit: 1, pageSize: 100 };
                        responsePlan = { binary: false, full: false, envelopePath: "", itemPath: "", fields: [], simplified: [] };
                        errorPlan = { "400": { "title": "Bad request" }, "401": { "title": "Unauthorized" } };
                        break;
                    }
                    default: throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unsupported operation ${operation} for node version ${nodeVersion}`, { itemIndex });
                }
                const returnAll = pagination.style !== 'none' ? Boolean((_a = nodeOptions.returnAll) !== null && _a !== void 0 ? _a : false) : false;
                const resultLimit = pagination.style !== 'none' && !returnAll ? Number((_b = nodeOptions.resultLimit) !== null && _b !== void 0 ? _b : 50) : Math.min(pagination.maxItems, Number.POSITIVE_INFINITY);
                const pageStartTime = Date.now();
                const seenCursors = new Map();
                const seenPages = new Map();
                let page = 1;
                let offset = 0;
                let cursor;
                let pagesFetched = 0;
                let estimatedBytes = 0;
                let finished = false;
                while (!finished && output.length - outputStart < resultLimit && pagesFetched < pagination.maxPages) {
                    if (Date.now() - pageStartTime > pagination.maxElapsedMs)
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Pagination elapsed-time budget was exceeded', { itemIndex });
                    const qs = options.qs;
                    if (pagination.limit && (pagesFetched > 0 || qs[pagination.limit] === undefined))
                        qs[pagination.limit] = Math.min(pagination.pageSize, resultLimit - (output.length - outputStart));
                    if (pagination.style === 'offset' && pagination.page)
                        qs[pagination.page] = offset;
                    if (pagination.style === 'pageNumber' && pagination.page)
                        qs[pagination.page] = page;
                    if (pagination.style === 'cursor' && pagination.cursor && cursor)
                        qs[pagination.cursor] = cursor;
                    const response = await (0, http_1.requestWithRetry)(this, options, credentialApplications, retryContract, itemIndex);
                    pagesFetched += 1;
                    const pageFingerprint = JSON.stringify(response);
                    const pageRepeats = ((_c = seenPages.get(pageFingerprint)) !== null && _c !== void 0 ? _c : 0) + 1;
                    seenPages.set(pageFingerprint, pageRepeats);
                    if (pageRepeats > pagination.repeatedPageLimit)
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Pagination repeated-page budget was exceeded', { itemIndex });
                    estimatedBytes += pageFingerprint.length;
                    if (estimatedBytes > pagination.maxMemoryBytes)
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Pagination memory budget was exceeded', { itemIndex });
                    if (responsePlan.binary) {
                        const binaryPayload = responsePlan.full ? ((_d = response.body) !== null && _d !== void 0 ? _d : response) : response;
                        const responseHeaders = (_e = (responsePlan.full ? response.headers : undefined)) !== null && _e !== void 0 ? _e : {};
                        const contentType = String((_f = responseHeaders['content-type']) !== null && _f !== void 0 ? _f : '').split(';')[0].trim() || 'application/octet-stream';
                        const binaryData = await this.helpers.prepareBinaryData(Buffer.from(binaryPayload), undefined, contentType);
                        output.push({ json: {}, binary: { data: binaryData }, pairedItem: { item: itemIndex } });
                        finished = true;
                        continue;
                    }
                    const normalizedResponse = responsePlan.full ? ((_g = response.body) !== null && _g !== void 0 ? _g : response) : response;
                    const envelopeValue = valueAtPath(normalizedResponse, responsePlan.envelopePath);
                    if (responsePlan.envelopePath && envelopeValue === undefined)
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Response envelope path "${responsePlan.envelopePath}" was not found`, { itemIndex });
                    const envelope = (envelopeValue !== null && envelopeValue !== void 0 ? envelopeValue : normalizedResponse);
                    const itemPath = pagination.itemPath || responsePlan.itemPath;
                    const extractedItems = valueAtPath(envelope, itemPath);
                    if (itemPath && extractedItems === undefined)
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Response item path "${itemPath}" was not found`, { itemIndex });
                    const deletedFallback = options.method === 'DELETE' && (normalizedResponse === undefined || normalizedResponse === null || normalizedResponse === '' ||
                        (typeof normalizedResponse === 'object' && !Array.isArray(normalizedResponse) && Object.keys(normalizedResponse).length === 0));
                    const values = deletedFallback
                        ? [{ deleted: true }]
                        : Array.isArray(extractedItems) ? extractedItems : Array.isArray(normalizedResponse) ? normalizedResponse : [extractedItems !== null && extractedItems !== void 0 ? extractedItems : envelope];
                    const outputMode = responsePlan.fields.length > 10 ? this.getNodeParameter('outputMode', itemIndex, 'simplified') : 'raw';
                    const selectedFields = outputMode === 'selected' ? this.getNodeParameter('selectedFields', itemIndex, []) : [];
                    for (const value of values) {
                        if (output.length - outputStart >= resultLimit)
                            break;
                        const fields = outputMode === 'simplified' ? responsePlan.simplified : outputMode === 'selected' ? selectedFields : [];
                        output.push({ json: selectResponseFields(value, fields), pairedItem: { item: itemIndex } });
                    }
                    if (!returnAll || pagination.style === 'none' || values.length === 0) {
                        finished = true;
                        continue;
                    }
                    if (pagination.hasMore && envelope[pagination.hasMore] === false) {
                        finished = true;
                        continue;
                    }
                    if (pagination.style === 'cursor') {
                        cursor = pagination.responseCursor ? valueAtPath(envelope, pagination.responseCursor) : undefined;
                        finished = !cursor;
                        if (cursor) {
                            const key = String(cursor);
                            const repeats = ((_h = seenCursors.get(key)) !== null && _h !== void 0 ? _h : 0) + 1;
                            seenCursors.set(key, repeats);
                            if (repeats > pagination.repeatedCursorLimit)
                                throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Pagination repeated-cursor budget was exceeded', { itemIndex });
                        }
                    }
                    if (pagination.advancement === 'offsetByItems')
                        offset += values.length;
                    if (pagination.advancement === 'incrementPage')
                        page += 1;
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    output.push({ json: { error: error.message }, pairedItem: { item: itemIndex } });
                    continue;
                }
                if (error instanceof n8n_workflow_1.NodeApiError) {
                    const status = String((_l = (_j = error.httpCode) !== null && _j !== void 0 ? _j : (_k = error.cause) === null || _k === void 0 ? void 0 : _k.statusCode) !== null && _l !== void 0 ? _l : 'default');
                    const planned = (_m = errorPlan[status]) !== null && _m !== void 0 ? _m : errorPlan.default;
                    if (planned) {
                        const parameterHelp = planned.parameter ? `Check the '${planned.parameter}' parameter.` : undefined;
                        const description = [planned.recovery, parameterHelp].filter(Boolean).join(' ');
                        throw new n8n_workflow_1.NodeApiError(this.getNode(), error, { itemIndex, message: planned.title, description });
                    }
                }
                if (error instanceof n8n_workflow_1.NodeApiError)
                    throw new n8n_workflow_1.NodeApiError(this.getNode(), error, { itemIndex });
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), error, { itemIndex });
            }
        }
        return [output];
    }
}
exports.Factorial = Factorial;
//# sourceMappingURL=Factorial.node.js.map