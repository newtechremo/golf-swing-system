// Export all DTOs for easy importing

// Auth
export * from './auth/AuthResponse.dto';
export * from './auth/LoginUser.dto';

// Common
export * from './common/ApiResponse.dto';

// Subject (formerly Member)
export * from './subject/CreateSubject.dto';
export * from './subject/UpdateSubject.dto';
export * from './subject/SubjectResponse.dto';

// Golf Swing
export * from './golf-swing/SwingAnalysisResponse.dto';
export * from './golf-swing/UploadSwingVideo.dto';

// Body Posture
export * from './posture/PostureAnalysisResponse.dto';
export * from './posture/UploadPostureImages.dto';

// History
export * from './history/AnalysisHistory.dto';

// PDF
export * from './pdf/GeneratePdf.dto';
