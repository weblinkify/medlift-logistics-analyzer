package com.medlift.analyzer.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RestrictedZoneRepository extends JpaRepository<RestrictedZoneEntity, Long> {

    List<RestrictedZoneEntity> findByActiveTrueOrderById();
}
