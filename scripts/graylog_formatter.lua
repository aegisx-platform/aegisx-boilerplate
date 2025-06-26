-- Graylog formatter for Fluent Bit
-- Converts log levels and formats messages for optimal Graylog processing

function format_for_graylog(tag, timestamp, record)
    local new_record = record
    
    -- Convert log levels to Graylog/syslog format
    local level_map = {
        emergency = 0,  -- System is unusable
        alert = 1,      -- Action must be taken immediately
        critical = 2,   -- Critical conditions
        error = 3,      -- Error conditions
        warning = 4,    -- Warning conditions
        notice = 5,     -- Normal but significant condition
        info = 6,       -- Informational messages
        debug = 7       -- Debug-level messages
    }
    
    -- Normalize level field
    if new_record["level"] then
        local level = string.lower(new_record["level"])
        
        -- Map common log levels
        if level == "err" or level == "error" then
            new_record["level"] = 3
        elseif level == "warn" or level == "warning" then
            new_record["level"] = 4
        elseif level == "info" or level == "information" then
            new_record["level"] = 6
        elseif level == "debug" then
            new_record["level"] = 7
        elseif level == "trace" then
            new_record["level"] = 7
        elseif level == "fatal" or level == "critical" then
            new_record["level"] = 2
        else
            -- Default to info level
            new_record["level"] = 6
        end
    else
        -- Default level if not present
        new_record["level"] = 6
    end
    
    -- Ensure hostname is present
    if not new_record["hostname"] then
        new_record["hostname"] = os.getenv("HOSTNAME") or "aegisx-api"
    end
    
    -- Create short message (required by GELF)
    if not new_record["short_message"] then
        if new_record["message"] then
            -- Truncate long messages for short_message
            local msg = tostring(new_record["message"])
            if string.len(msg) > 255 then
                new_record["short_message"] = string.sub(msg, 1, 252) .. "..."
            else
                new_record["short_message"] = msg
            end
        else
            new_record["short_message"] = "Log message"
        end
    end
    
    -- Create full message (optional but recommended)
    if not new_record["full_message"] and new_record["message"] then
        new_record["full_message"] = tostring(new_record["message"])
    end
    
    -- Add AegisX-specific fields with underscore prefix (Graylog custom fields)
    new_record["_aegisx_service"] = "aegisx-api"
    new_record["_aegisx_environment"] = os.getenv("ENVIRONMENT") or "development"
    new_record["_aegisx_version"] = os.getenv("SERVICE_VERSION") or "1.0.0"
    
    -- Add timestamp in GELF format if not present
    if not new_record["timestamp"] then
        new_record["timestamp"] = timestamp
    end
    
    -- Add facility if not present
    if not new_record["facility"] then
        new_record["facility"] = "user"
    end
    
    -- Healthcare context enhancement
    if new_record["patient_id"] or new_record["medical_record"] then
        new_record["_aegisx_context"] = "healthcare"
        new_record["_aegisx_hipaa"] = "compliant"
    end
    
    -- API context enhancement
    if new_record["method"] or new_record["url"] or new_record["status_code"] then
        new_record["_aegisx_context"] = "api"
        new_record["_aegisx_request_type"] = "http"
    end
    
    -- Database context enhancement
    if new_record["query"] or new_record["table"] then
        new_record["_aegisx_context"] = "database"
        new_record["_aegisx_component"] = "knex"
    end
    
    -- Error context enhancement
    if new_record["error"] or new_record["stack"] then
        new_record["_aegisx_error"] = "true"
        if new_record["stack"] then
            new_record["_aegisx_stack_trace"] = tostring(new_record["stack"])
        end
    end
    
    -- Performance metrics
    if new_record["duration"] then
        local duration = tonumber(new_record["duration"])
        if duration then
            new_record["_aegisx_duration_ms"] = duration
            -- Categorize performance
            if duration > 5000 then
                new_record["_aegisx_performance"] = "slow"
            elseif duration > 1000 then
                new_record["_aegisx_performance"] = "medium"
            else
                new_record["_aegisx_performance"] = "fast"
            end
        end
    end
    
    -- Add source information
    new_record["_aegisx_log_source"] = "fluent-bit"
    new_record["_aegisx_tag"] = tag
    
    return 1, timestamp, new_record
end