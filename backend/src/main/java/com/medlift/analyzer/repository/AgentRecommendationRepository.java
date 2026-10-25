package com.medlift.analyzer.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AgentRecommendationRepository extends JpaRepository<AgentRecommendationEntity, UUID> {}
