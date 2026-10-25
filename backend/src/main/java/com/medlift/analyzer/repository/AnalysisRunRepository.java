package com.medlift.analyzer.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AnalysisRunRepository extends JpaRepository<AnalysisRunEntity, UUID> {

    List<AnalysisRunEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
