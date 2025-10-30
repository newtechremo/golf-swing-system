#!/bin/bash

# Add @Inject decorators to all Use Cases

# Function to add Inject import and decorator
add_inject() {
    local file=$1
    local interface=$2
    local variable=$3

    # Check if file already has Inject
    if ! grep -q "@Inject" "$file"; then
        # Add Inject to imports
        sed -i "s/import { Injectable/import { Injectable, Inject/g" "$file"

        # Add @Inject decorator before repository
        sed -i "s/private readonly ${variable}: ${interface}/@Inject('${interface}')\n    private readonly ${variable}: ${interface}/g" "$file"
    fi
}

# Auth Use Cases
add_inject "src/application/use-cases/auth/LoginUserUseCase.ts" "IUserRepository" "userRepository"

# Subject Use Cases
add_inject "src/application/use-cases/subject/CreateSubjectUseCase.ts" "ISubjectRepository" "subjectRepository"
add_inject "src/application/use-cases/subject/UpdateSubjectUseCase.ts" "ISubjectRepository" "subjectRepository"
add_inject "src/application/use-cases/subject/GetSubjectsUseCase.ts" "ISubjectRepository" "subjectRepository"
add_inject "src/application/use-cases/subject/GetSubjectDetailUseCase.ts" "ISubjectRepository" "subjectRepository"
add_inject "src/application/use-cases/subject/DeleteSubjectUseCase.ts" "ISubjectRepository" "subjectRepository"

# Golf Swing Use Cases
add_inject "src/application/use-cases/golf-swing/UploadSwingVideoUseCase.ts" "ISubjectRepository" "subjectRepository"
add_inject "src/application/use-cases/golf-swing/UploadSwingVideoUseCase.ts" "IGolfSwingAnalysisRepository" "analysisRepository"
add_inject "src/application/use-cases/golf-swing/GetSwingAnalysisUseCase.ts" "IGolfSwingAnalysisRepository" "analysisRepository"
add_inject "src/application/use-cases/golf-swing/UpdateSwingMemoUseCase.ts" "IGolfSwingAnalysisRepository" "analysisRepository"

# Body Posture Use Cases
add_inject "src/application/use-cases/body-posture/UploadPostureImagesUseCase.ts" "ISubjectRepository" "subjectRepository"
add_inject "src/application/use-cases/body-posture/UploadPostureImagesUseCase.ts" "IBodyPostureAnalysisRepository" "analysisRepository"
add_inject "src/application/use-cases/body-posture/GetPostureAnalysisUseCase.ts" "IBodyPostureAnalysisRepository" "analysisRepository"
add_inject "src/application/use-cases/body-posture/UpdatePostureMemoUseCase.ts" "IBodyPostureAnalysisRepository" "analysisRepository"

# History Use Cases
add_inject "src/application/use-cases/history/GetAnalysisHistoryUseCase.ts" "ISubjectRepository" "subjectRepository"
add_inject "src/application/use-cases/history/GetCalendarDataUseCase.ts" "ISubjectRepository" "subjectRepository"

echo "✅ Injection decorators added to all Use Cases"
