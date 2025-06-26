-- Correlation ID enhancement script for Fluent Bit
-- Adds correlation tracking and session management

function add_correlation_metadata(tag, timestamp, record)
    local new_record = record
    
    -- Extract correlation ID from different possible fields
    local correlation_id = record["correlationId"] or 
                          record["correlation_id"] or 
                          record["traceId"] or 
                          record["trace_id"]
    
    if correlation_id then
        new_record["correlationId"] = correlation_id
        new_record["hasCorrelation"] = true
        
        -- Add session tracking
        if record["userId"] then
            new_record["sessionKey"] = correlation_id .. ":" .. record["userId"]
        end
        
        -- Add request flow tracking
        if record["operation"] then
            new_record["flowKey"] = correlation_id .. ":" .. record["operation"]
        end
    else
        new_record["hasCorrelation"] = false
    end
    
    -- Add processing metadata
    new_record["processed_by"] = "fluent-bit"
    new_record["processed_at"] = os.date("!%Y-%m-%dT%H:%M:%S.000Z")
    
    -- Add log severity scoring
    local level = record["level"] or "info"
    local severity_score = 0
    
    if level == "error" then
        severity_score = 4
    elseif level == "warn" then
        severity_score = 3
    elseif level == "info" then
        severity_score = 2
    elseif level == "debug" then
        severity_score = 1
    end
    
    new_record["severity_score"] = severity_score
    
    -- Add healthcare context markers
    if record["complianceLevel"] == "HIPAA" then
        new_record["healthcare_context"] = true
        new_record["compliance_required"] = true
    end
    
    -- Add performance markers
    if record["responseTime"] then
        local response_time = tonumber(record["responseTime"])
        if response_time then
            if response_time > 5000 then
                new_record["performance_alert"] = "critical"
            elseif response_time > 2000 then
                new_record["performance_alert"] = "warning"
            elseif response_time > 1000 then
                new_record["performance_alert"] = "slow"
            else
                new_record["performance_alert"] = "normal"
            end
        end
    end
    
    return 1, timestamp, new_record
end